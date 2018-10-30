pragma solidity ^0.4.25;

/**
 * Holder tracking functionality for a contract.
 *
 * A function `trackHolder` is provided that stores the holder of tokens in a
 * public `holders` array.
 */
contract TrackHolder {

    // track if a user is a known token holder to the smart contract - important payouts later
    mapping (address => bool) public isHolder;

    // array of all known holders - important for payouts later
    address[] public holders;

    /**
     * Allows to figure out the total number of known token holders
     */
    function getHolderCount()
        public
        constant
        returns (uint256 _holderCount)
    {
        return holders.length;
    }

    /**
     * Allows for easier retrieval of holder by array index
     */
    function getHolder(uint256 _index)
        public
        constant
        returns (address _holder)
    {
        return holders[_index];
    }

    /**
     * Track the given token holder
     */
    function trackHolder(address _holder)
        internal
    {
        // Check if the recipient is a known token holder
        if (isHolder[_holder] == false) {
            // if not, add him to the holders array and mark him as a known holder
            holders.push(_holder);
            isHolder[_holder] = true;
        }
    }
}
