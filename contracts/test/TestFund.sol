pragma solidity ^0.4.24;

import "../StandardToken.sol";
import "../RiseFund.sol";

contract TestFund is StandardToken, RiseFund {

    function recieveRelocation(address _creditor, uint _balance)
    external
    returns (bool) {
        uint256 oldBalance = balances[_creditor];
        balances[_creditor] = SafeMath.add(oldBalance, _balance);
        return true;
    }

    function payout(address _riseToken, address _creditor, uint256 _balance)
        public
    {
        StandardToken token = StandardToken(_riseToken);
        token.transfer(_creditor, _balance);

        balances[_creditor] = SafeMath.sub(balances[_creditor], _balance);
    }
}
