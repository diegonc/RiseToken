pragma solidity ^0.4.25;

import "./StandardToken.sol";
import "./KYC.sol";
import "./TrackHolder.sol";
import "./Oraclize.sol";
import "./States.sol";
import "./Ownable.sol";
import "./Vendors.sol";
import "./RiseFund.sol";
import "./SafeMath.sol";

/**
 * @title The RiseToken Token contract.
 *
 *
 * This software is a subject to FOXUNIT Agreement.
 * No use or distribution is allowed without written permission from FOXUNIT.
 * http://nikitafuchs.com/
 *
 */
contract RiseToken is StandardToken, KYC, Vendors, TrackHolder, Oraclize {

    // Token metadata
    string public constant name = "RISE";
    string public constant symbol = "RSE";
    uint256 public constant decimals = 18;

    // Fundraising goals: minimums and maximums
    uint256 public constant TOKEN_CREATION_CAP = 170 * (10**6) * 10**decimals; // 170 million RSEs
    uint256 public constant TOKEN_MIN = 1 * 10**decimals;                      // 1 RSE

    // Discount multipliers
    uint256 public constant TOKEN_FIRST_DISCOUNT_MULTIPLIER  = 142857; // later divided by 10^5 to give users 1,42857 times more tokens per ETH == 30% discount
    uint256 public constant TOKEN_SECOND_DISCOUNT_MULTIPLIER = 125000; // later divided by 10^5 to give users 1,25 more tokens per ETH == 20% discount
    uint256 public constant TOKEN_THIRD_DISCOUNT_MULTIPLIER  = 111111; // later divided by 10^5 to give users 1,11111 more tokens per ETH == 10% discount

    // Fundraising parameters provided when creating the contract
    uint256 public fundingStartTime; // These two blocks need to be chosen to comply with the
    uint256 public fundingEndTime;   // start date and 29 day duration requirements
    uint256 public roundTwoTime;     // timestamp that triggers the second exchange rate change
    uint256 public roundThreeTime;   // timestamp that triggers the third exchange rate change
    uint256 public roundFourTime;    // timestamp that triggers the fourth exchange rate change
    uint256 public lockedReleaseTime; // timestamp that triggers purchases made by CC be transferable

    //@dev Usecase related: Purchasing Tokens with Credit card
    //@dev Usecase related: Canceling purchases done with credit card
    mapping (bytes16 => bool) purchaseIdTaken;        // check if the purchase ID was used already. In case of CC chargebacks, tokens are burned by referencing the ID and the amount is proven by the payment receipt
    mapping (address => uint256) public lockedTokens; // tracking the total amount of tokens users have bought via CC - locked up until lockedReleaseTime

    // ETH balance per user:
    // Since we have different exchange rates at different stages, we need to keep track
    // of how much ether each contributed in case that we need to issue a refund
    mapping (address => uint256) public ethBalances;
    mapping (address => uint256) public ethTokens; // tracking the total amount of tokens users have bought via ETH

    // Total received ETH balances
    // We need to keep track of how much ether have been contributed, since we have a cap for ETH too
    uint256 public allReceivedEth;

    // Related to the RISE fonds
    mapping (address => bool) public isRiseFund;
    address[] public riseFunds;
    //"In what fund does which address have how many locked tokens?"
    mapping(address=> mapping(address => uint256)) public lockedTokensInFunds;

    // Events used for logging
    event LogCreateRSE(address indexed _to, uint256 _value);
    event LogDeliverRSE(address indexed _to, bytes16 indexed purchaseId, uint256 _value);
    event LogCancelDelivery(address indexed _to, bytes16 indexed _id, uint256 tokenAmount);
    event LogKycRefused(address indexed _user, uint256 _value);

    modifier hasEnoughUnlockedTokens(address _user, uint256 _value) {
        // check if the user was a CC buyer and if the lockup period is not over,
        if (lockedTokens[_user] > 0 && block.timestamp < lockedReleaseTime) {
            // allow to only transfer the not-locked up tokens
            require ((SafeMath.sub(balances[_user], _value)) >= lockedTokens[_user]);
        }
        _;
    }

    modifier isNoContract(address _address) {
        // make sure it's no contract, for safety reasons.
        uint32 size;
        assembly {
            size := extcodesize(_address)
        }
        require(size == 0);
        _;
    }

    /**
     * Create a new RiseToken contract.
     *
     *  @param _fundingStartTime The starting timestamp of the fundraiser (has to be in the future).
     *  @param _admin1 The first admin account that owns this contract.
     *  @param _admin2 The second admin account that owns this contract.
     *  @param _tokenVendor1 An account that is allowed to create tokens.
     *  @param _tokenVendor2 An account that is allowed to create tokens.
     *  @param _tokenVendor3 An account that is allowed to create tokens.
     *  @param _kyc1 Initial KYC member.
     *  @param _kyc2 Initial KYC member.
     *  @param _kyc3 Initial KYC member.
     */
    constructor(
        uint256 _fundingStartTime,
        address _admin1,
        address _admin2,
        address _tokenVendor1,
        address _tokenVendor2,
        address _tokenVendor3,
        address _kyc1,
        address _kyc2,
        address _kyc3
    )
        public
        Ownable(_admin1, _admin2)
        Vendors(_tokenVendor1, _tokenVendor2, _tokenVendor3)
        KYC(_kyc1, _kyc2, _kyc3)
    {
        // The start of the fundraising should happen in the future
        require (block.timestamp <= _fundingStartTime);

        // Init contract state
        fundingStartTime = _fundingStartTime;
        fundingEndTime = fundingStartTime + 29 days;
        roundTwoTime = _fundingStartTime + 6 days;
        roundThreeTime = roundTwoTime + 7 days;
        roundFourTime = roundThreeTime + 7 days;
        lockedReleaseTime = fundingEndTime + 183 days;
    }

    /**
     * Override method to check if token transfer is allowed:
     * - Contract has to be finalized.
     * - Sender has to be KYC verified.
     * - Enough tokens have to be unlocked.
     */
    function transfer(address _to, uint256 _value)
        public
        isFinalized // Only allow token transfer after the fundraising has ended
        isKycVerified(msg.sender)
        hasEnoughUnlockedTokens(msg.sender, _value)
        returns (bool success)
    {
        bool result = super.transfer(_to, _value);
        if (result) {
            trackHolder(_to); // track the owner for later payouts
        }

        // Check if a fund is returning locked tokens and if we have to lock them again
        if (result && block.timestamp < lockedReleaseTime && isRiseFund[msg.sender]) {
            // Check if the recipient has ever transfered some locked tokens to that fund.
            uint256 lockedTokensInFund = lockedTokensInFunds[msg.sender][_to];
            if (lockedTokensInFund > 0) {
                // Calculate how many tokens in this transaction are locked tokens
                uint256 locked = SafeMath.min(lockedTokensInFund, _value);

                // Move locked tokens from fund back to account
                lockedTokens[_to] = SafeMath.add(lockedTokens[_to], locked);
                lockedTokensInFunds[msg.sender][_to] = SafeMath.sub(lockedTokensInFunds[msg.sender][_to], locked);
            }
        }
        return result;
    }

    /**
     * Override method to check if token transfer is allowed:
     * - Contract has to be finalized.
     * - Sender has to be KYC verified.
     * - Enough tokens have to be unlocked.
     */
    function transferFrom(address _from, address _to, uint256 _value)
        public
        isFinalized // Only allow token transfer after the fundraising has ended
        isKycVerified(_from)
        hasEnoughUnlockedTokens(_from, _value)
        returns (bool success)
    {
        bool result = super.transferFrom(_from, _to, _value);
        if (result) {
            trackHolder(_to); // track the owner for later payouts
        }
        return result;
    }

    /**
     * Deliver tokens that have been bought offline.
     *
     * Discount multipliers are applied off-contract in this case
     *
     * @param _to Recipient of the tokens.
     * @param _cents Tokens in Cents, e.g. 1 Token == 1$, passed as 100 cents.
     * @param _purchaseId A unique ID of the purchase from payment provider.
     * @param _unlocked Boolean to determine if the delivered tokens need to be locked (not the case for BTC buyers, their payment is final)
     */
    function deliverTokens(address _to, uint256 _cents, bytes16 _purchaseId, bool _unlocked)
        external
        isFundraising
        tokensDeliverable
        onlyVendor
    {
        require(block.timestamp >= fundingStartTime);
        require(_to != 0x0);
        require(_cents > 0);
        require(_purchaseId.length > 0);

        // Prevent from adding a delivery multiple times
        require(purchaseIdTaken[_purchaseId] == false);
        purchaseIdTaken[_purchaseId] = true;

        // Calculate the total amount of tokens and cut out the extra two decimal units,
        // because tokens was in cents.
        uint256 tokens = SafeMath.mul(_cents, (10**(decimals) / 10**2));

        // Check that the new total token amount would not exceed the token cap
        uint256 checkedSupply = SafeMath.add(totalSupply, tokens);
        require(checkedSupply <= TOKEN_CREATION_CAP);

        // Proceed only when all the checks above have passed

        // Update total token amount and token balance
        totalSupply = checkedSupply;
        balances[_to] = SafeMath.add(balances[_to], tokens);

        // If tokens were not paid with BTC (but credit card), they need to be locked up
        if (_unlocked == false) {
            lockedTokens[_to] = SafeMath.add(lockedTokens[_to], tokens);
        }

        // To force the check for KYC Status upon the user when he tries
        // transferring tokens and exclude every later token owner
        isIcoBuyer[_to] = true;

        // Log the creation of these tokens
        emit LogDeliverRSE(_to, _purchaseId, tokens);
        emit Transfer(address(0x0), _to, tokens);
        trackHolder(_to);
    }

    /**
     * Deliver tokens in batch.
     *
     * Same logic as deliverTokens.
     *
     * @param _to Recipient of the tokens.
     * @param _cents Tokens in Cents, e.g. 1 Token == 1$, passed as 100 cents.
     * @param _purchaseId A unique ID of the purchase from payment provider.
     * @param _unlocked Boolean to determine if the delivered tokens need to be locked (not the case for BTC buyers, their payment is final)
     */
    function deliverTokensBatch(address[] _to, uint256[] _cents, bytes16[] _purchaseId, bool[] _unlocked )
        external
        isFundraising
        tokensDeliverable
        onlyVendor
    {
        require(_to.length == _cents.length);
        require(_to.length == _purchaseId.length);
        require(_to.length == _unlocked.length);

        require(block.timestamp >= fundingStartTime);

        uint256 tokens;
        uint256 checkedSupply;

        for (uint8 i = 0 ; i < _to.length; i++) {
            require(_to[i] != 0x0);
            require(_cents[i] > 0);
            require(_purchaseId[i].length > 0);

            // Prevent from adding a delivery multiple times
            require(purchaseIdTaken[_purchaseId[i]] == false);
            purchaseIdTaken[_purchaseId[i]] = true;

            // Calculate the total amount of tokens and cut out the extra two decimal units,
            // because _tokens was in cents.
            tokens = SafeMath.mul(_cents[i], (10**(decimals) / 10**2));

            // Check that the new total token amount would not exceed the token cap
            checkedSupply = SafeMath.add(totalSupply, tokens);
            require(checkedSupply <= TOKEN_CREATION_CAP);

            // Proceed only when all the checks above have passed

            // Update total token amount and token balance
            totalSupply = checkedSupply;
            balances[_to[i]] = SafeMath.add(balances[_to[i]], tokens);

            // If tokens were not paid with BTC (but credit card), they need to be locked up
            if (_unlocked[i] == false) {
                lockedTokens[_to[i]] = SafeMath.add(lockedTokens[_to[i]], tokens);
            }

            // To force the check for KYC Status upon the user when he tries
            // transferring tokens and exclude every later token owner
            isIcoBuyer[_to[i]] = true;

            // Log the creation of these tokens
            emit LogDeliverRSE(_to[i], _purchaseId[i], tokens);
            emit Transfer(address(0x0), _to[i], tokens);
            trackHolder(_to[i]);
        }
    }

    /**
     * Called in case a buyer cancels his CC payment.
     *
     * Burns the tokens that have been delivered in deliverTokens/deliverTokensBatch.
     *
     * @param _purchaseId A unique ID of the purchase from payment provider.
     * @param _buyer Buyer of the tokens.
     * @param _cents Tokens in Cents, e.g. 1 Token == 1$, passed as 100 cents.
     */
    function cancelDelivery(bytes16 _purchaseId, uint _cents, address _buyer)
        external
        onlyKycTeam
    {
        // CC payments are only cancelable until lockedReleaseTime
        require (block.timestamp < lockedReleaseTime);

        // check if the purchase ID really exists to prove to auditors only actually canceled payments were made undone.
        require (purchaseIdTaken[_purchaseId] == true);
        purchaseIdTaken[_purchaseId] = false;

        // now withdraw the canceled purchase's token amount from the user's balance
        // calculate the total amount of tokens and cut out the extra two decimal units, because it's cents.
        uint256 tokens = SafeMath.mul(_cents, (10**(decimals) / 10**2));

        // Proceed only when all the checks above have passed

        // Update total token amount and token balance
        totalSupply = SafeMath.sub(totalSupply, tokens);
        balances[_buyer] = SafeMath.sub(balances[_buyer], tokens);

        // and withdraw the canceled purchase's token amount from the lockedUp token balance
        lockedTokens[_buyer] = SafeMath.sub(lockedTokens[_buyer], tokens);

        emit LogCancelDelivery(_buyer, _purchaseId, tokens);
        emit Transfer(_buyer, address(0x0), tokens);

        //@CC Binod at al.: This is not proof of god. It was neccessary to remove costly program logic. In case of a dispute,
        // people could refer to the purchaseID. Without a valid one there is no cancelation possible.
    }

    /**
     * Token buying via ETH (disabled by default).
     *
     * Make tokens buyable through fallback function.
     */
    function ()
        public
        payable
    {
        createTokens();
    }

    /**
     * Token buying via ETH (disabled by default).
     */
    function createTokens()
        payable
        public
        isFundraising
    {
        require(ETH_USD_EXCHANGE_RATE_IN_CENTS > 0);
        require(saleThroughContractEnabled == true);
        require(block.timestamp >= fundingStartTime);
        require(block.timestamp <= fundingEndTime);
        require(msg.value > 0);

        // Calculate the token amount:
        // - Divide by 100 to turn ETH_USD_EXCHANGE_RATE_IN_CENTS into full USD
        // - Apply discount multiplier
        uint256 tokens = SafeMath.mul(msg.value, ETH_USD_EXCHANGE_RATE_IN_CENTS);
        tokens = tokens / 100;
        tokens = SafeMath.mulPercentage(tokens, getCurrentDiscountRate());

        // Check that at least one token is created
        require(tokens >= TOKEN_MIN);

        // Check that the new total token amount would not exceed the token cap
        uint256 checkedSupply = SafeMath.add(totalSupply, tokens);
        require(checkedSupply <= TOKEN_CREATION_CAP);

        // Proceed only when all the checks above have passed

        // Update total token amount and token balance
        totalSupply = checkedSupply;
        balances[msg.sender] += tokens;  // safeAdd not needed; bad semantics to use here
        ethTokens[msg.sender] += tokens; // safeAdd not needed; bad semantics to use here

        // Update total eth amount and eth balance
        allReceivedEth = SafeMath.add(allReceivedEth, msg.value);
        ethBalances[msg.sender] = SafeMath.add(ethBalances[msg.sender], msg.value);

        // To force the check for KYC Status upon the user when he tries
        // transferring tokens and exclude every later token owner
        isIcoBuyer[msg.sender] = true;

        // Log the creation of these tokens
        emit LogCreateRSE(msg.sender, tokens);
        emit Transfer(address(0x0), msg.sender, tokens);
        trackHolder(msg.sender);
    }

    /**
     * Refuse KYC of a user that contributed in ETH.
     *
     * Burns the tokens that have been created via createTokens.
     */
    function refuseKyc(address _user)
        external
        onlyKycTeam
        payable
    {
        // Refusing KYC of a user, who only contributed in ETH.
        // We must pay close attention here for the case that a user contributes in ETH AND(!) CC !
        // in this case, he must only kill the tokens he received through ETH, the ones bought in fiat will be
        // killed by canceling his payments and subsequently calling cancelDelivery() with the according payment id.

        // Once a user is verified, you can't kick him out.
        require (kycVerified[_user] == false);

        // Imediately stop, if a user has none or only CC contributions.
        // we're managing kyc refusing of CC contributors off-chain
        require(ethBalances[_user] > 0);
        require(msg.value == ethBalances[_user]);

        // Ensure that token balance is not zero
        uint256 tokenBalance = balances[_user];
        require(tokenBalance > 0);

        // Proceed only when all the checks above have passed

        // Update total token amount and token balance
        uint256 tokens = ethTokens[_user];
        totalSupply = SafeMath.sub(totalSupply, tokens); // Extra safe
        balances[_user] = SafeMath.sub(balances[_user], tokens);
        ethTokens[_user] = 0;

        // Update total eth amount and eth balance
        allReceivedEth = SafeMath.sub(allReceivedEth, msg.value);
        ethBalances[_user] = 0;

        // Log this refund
        emit LogKycRefused(_user, msg.value);
        emit Transfer(_user, address(0x0), tokens);

        // Send the contributions only after we have updated all the balances
        // If you're using a contract, make sure it works with .transfer() gas limits
        _user.transfer(msg.value);
    }

    /**
     * Returns the current token price.
     */
    function getCurrentDiscountRate()
        private
        constant
        returns (uint256 currentDiscountRate)
    {
        // determine which discount to apply
        if (block.timestamp < roundTwoTime) {
            // first round
            return TOKEN_FIRST_DISCOUNT_MULTIPLIER;
        } else if (block.timestamp < roundThreeTime){
            // second round
            return TOKEN_SECOND_DISCOUNT_MULTIPLIER;
        } else if (block.timestamp < roundFourTime) {
            // third round
            return TOKEN_THIRD_DISCOUNT_MULTIPLIER;
        } else {
            // fourth round, no discount
            return 100000;
        }
    }

    /**
     * Approve KYC status of a user.
     *
     * Called by KYC team.
     */
    function unlockKyc(address _owner)
        external
        onlyKycTeam
    {
        require(kycVerified[_owner] == false);

        // Unlock the owner to allow transfer of tokens
        kycVerified[_owner] = true;

        // we leave the lockedTokens[_owner] as is, because also KYCed users could cancel their CC payments
    }

    /**
     * Revoke KYC status of a user.
     *
     * Called by KYC team.
     */
    function revokeKyc(address _owner)
        external
        onlyKycTeam
        isFundraisingIgnorePaused
    {
        require(kycVerified[_owner] == true);

        //revoke the KYC
        kycVerified[_owner] = false;

        // we leave the lockedTokens[_owner] as is, because also KYCed users could cancel their CC payments
    }

    /**
     * Allows admin to transfer ether from the contract.
     */
    function retrieveEth(address _recipient, uint256 _value)
        external
        onlyOwner
        isNoContract(_recipient)
    {
        // Make sure a recipient was defined !
        require(_recipient != 0x0);
        require(_value <= address(this).balance, "Withdraw amount exceeds contract balance");

        // Send the eth to where admins agree upon
        _recipient.transfer(_value);
    }

    /**
     * Ends the fundraising period once and for all.
     *
     * Afterwards token transfers via transfer/transferFrom are enabled.
     */
    function finalize()
        external
        isFundraising
        onlyOwner  // Only the admins calling this method exactly the same way can finalize the sale.
    {
        // Only allow to finalize the contract before the ending time if we already reached the cap
        require(block.timestamp > fundingEndTime || totalSupply >= TOKEN_CREATION_CAP);

        // Move the contract to Finalized state
        finalizeFundraising();
    }

    /**
     * Allow admins to add fonds
     */
    function addFond(address _fund)
        external
        onlyOwner
    {
        riseFunds.push(_fund);
        isRiseFund[_fund] = true;
    }

    /**
     * Allow token holder to move tokens into fund.
     */
    function moveTokensToFund(address _fund, uint256 _tokens)
        external
    {
        // make sure target is added as fund already
        require(isRiseFund[_fund] == true);

        // Define target contract
        RiseFund newFund = RiseFund(_fund);

        // perform the following only if CC lock up time is not passed
        // and the user has locked up tokens
        if (block.timestamp < lockedReleaseTime && lockedTokens[msg.sender] > 0) {
            // Calculate how many tokens in this transaction are locked tokens
            uint256 locked = SafeMath.min(lockedTokens[msg.sender], _tokens);

            // Move locked tokens from account to fund (will later be moved back in transfer() from fund to account)
            lockedTokens[msg.sender] = SafeMath.sub(lockedTokens[msg.sender], locked);
            lockedTokensInFunds[_fund][msg.sender] = SafeMath.add(lockedTokensInFunds[_fund][msg.sender], locked);
        }

        // Now that locked token tracking was taken care of, we can perform a
        // transfer to the fund (lockedTokens are already reduced, so transfer will succeed)
        require(transfer(_fund, _tokens));

        // Perform the relocation of balances to new contract
        require(newFund.recieveRelocation(msg.sender, _tokens));
    }
}
