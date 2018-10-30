pragma solidity ^0.4.25;

/**
 * @title Safe math operations that throw error on overflow.
 *
 * Credit: Taking ideas from FirstBlood token
 */
library SafeMath {

    /**
     * Safely add two numbers.
     *
     * @param x First operant.
     * @param y Second operant.
     * @return The result of x+y.
     */
    function add(uint256 x, uint256 y)
    internal pure
    returns (uint256) {
        uint256 z = x + y;
        assert((z >= x) && (z >= y));
        return z;
    }

    /**
     * Safely subtract two numbers.
     *
     * @param x First operant.
     * @param y Second operant.
     * @return The result of x-y.
     */
    function sub(uint256 x, uint256 y)
    internal pure
    returns (uint256) {
        assert(x >= y);
        uint256 z = x - y;
        return z;
    }

    /**
     * Safely multiply two numbers.
     *
     * @param x First operant.
     * @param y Second operant.
     * @return The result of x*y.
     */
    function mul(uint256 x, uint256 y)
    internal pure
    returns (uint256) {
        uint256 z = x * y;
        assert((x == 0) || (z / x == y));
        return z;
    }

    /**
     * Safely multiply percentage.
     *
     * @param value First operant.
     * @param percentage The percentage multiplication factor times 100,000 (range: 0 =< percentage < 200,000).
     * @return The result of (value * percentage) / 100,000.
     */
    function mulPercentage(uint256 value, uint256 percentage)
    internal pure
    returns (uint256 resultValue)
    {
        require(percentage >= 0);
        require(percentage < 200000);

        // Multiply with percentage
        uint256 newValue = mul(value, percentage);

        // Remove the 5 extra decimals
        newValue = newValue / 10**5;
        return newValue;
    }

    /**
     * Safely find the minimum of two numbers.
     *
     * @param x First number.
     * @param y Second number.
     * @return The smaller number.
     */
    function min(uint256 x, uint256 y)
    internal pure
    returns (uint256) {
        if (x < y) {
            return x;
        } else {
            return y;
        }
    }
}
