pragma solidity ^0.4.25;

import "./Ownable.sol";

/**
 * KYC team and ico buyer tracking.
 */
contract KYC is Ownable {

    // to determine, if a user belongs to the KYC team or not
    mapping (address => bool) public isKycTeam;

    // to check if user has already undergone KYC or not, to lock up his tokens until then
    mapping (address => bool) public kycVerified;

    // For tracking if user has to be kyc verified before being able to transfer tokens
    mapping (address => bool) isIcoBuyer;

    modifier onlyKycTeam(){
        require(isKycTeam[msg.sender] == true);
        _;
    }

    modifier isKycVerified(address _user) {
        // if token transferring user acquired the tokens through the ICO...
        if (isIcoBuyer[_user] == true) {
            // ...check if user is already unlocked
            require (kycVerified[_user] == true);
        }
        _;
    }

    constructor(
        address _kycMember1,
        address _kycMember2,
        address _kycMember3
    )
        internal
    {
        isKycTeam[_kycMember1] = true;
        isKycTeam[_kycMember2] = true;
        isKycTeam[_kycMember3] = true;
    }

    /**
     * Add a user to the KYC team
     */
    function addToKycTeam(address _teamMember)
        public
        onlyOwner
    {
        isKycTeam[_teamMember] = true;
    }

    /**
     * Remove a user from the KYC team
     */
    function removeFromKycTeam(address _teamMember)
        public
        onlyOwner
    {
        isKycTeam[_teamMember] = false;
    }
}
