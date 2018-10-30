pragma solidity ^0.4.25;

import "./States.sol";
import "./usingOraclize.sol";
import "./SafeMath.sol";

/**
 * Update ETH/USD exchange rate via Oraclize.
 */
contract Oraclize is States, usingOraclize {

    // Current ETH/USD exchange rate (set by oraclize)
    uint256 public ETH_USD_EXCHANGE_RATE_IN_CENTS;

    // Backup Option to Fractal's Tokensale Mechanism
    bool public saleThroughContractEnabled = false;

    // Everything oraclize related
    uint256 private oraclizeGasAmount = 260000;

    mapping (bytes32 => bool) private oraclizeIds;

    // Events
    event UpdatedPrice(string price);
    event NewOraclizeQuery(string description);

    /**
     * Oraclize is called recursively here - once a callback fetches the newest
     * ETH price, the next callback is scheduled for the next hour again
     */
    function __callback(bytes32 myid, string result)
        public
    {
        require(msg.sender == oraclize_cbAddress());

        if (!oraclizeIds[myid]) {
            oraclizeIds[myid] = true;

            // setting the token price here
            ETH_USD_EXCHANGE_RATE_IN_CENTS = parseInt(result, 2);
            emit UpdatedPrice(result);
        }

        // Periodically fetch the next price
        updatePrice();
    }

    /**
     * A way for replenishing contract's ETH balance, just in case
     */
    function updatePrice()
        public
        payable
    {
        // no need for price updates when sale through contract is not enabled
        require(saleThroughContractEnabled == true);

        // Sender has to provide enough gas
        if (msg.sender != oraclize_cbAddress()) {
            require(msg.value >= 200 finney);
        }

        if (oraclize_getPrice("URL") > address(this).balance) {
            emit NewOraclizeQuery("Oraclize NOT sent: Insufficient funds.");
        } else {
            emit NewOraclizeQuery("Oraclize sent...");
            // Schedule query in 1 hour. Set the gas amount to 220000, as parsing in __callback takes around 70000 - we play it safe.
            oraclize_query(3600, "URL", "json(https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD).USD", oraclizeGasAmount);
        }
    }

    /**
     * Customizing the gas price for oraclize calls during "ICO Rush hours"
     */
    function setOraclizeGas(uint256 _price, uint256 _amount)
        external
        onlyOwner
    {
        uint256 gas = _price * 10**9;
        oraclize_setCustomGasPrice(gas);
        oraclizeGasAmount = _amount;
    }

    /**
     * Token sale via eth is disabled by default, but can be enabled
     * backup option
     */
    function enableSaleThroughContract(bool _saleEnabled)
        external
        payable
        onlyOwner
    {
        saleThroughContractEnabled = _saleEnabled;

        updatePrice();
    }
}
