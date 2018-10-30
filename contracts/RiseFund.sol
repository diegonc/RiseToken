pragma solidity ^0.4.25;

/**
 * RISETokens can be moved to a fund.
 *
 * Funds have to implement the following interface.
 */
contract RiseFund {

    /**
     * Function of possible new fond to recieve tokenbalance to relocate - to be protected by msg.sender == RiseToken
     */
    function recieveRelocation(address _creditor, uint256 _balance) external returns (bool);
}
