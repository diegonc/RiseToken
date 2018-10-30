pragma solidity ^0.4.25;

/**
 * Define vendors that are allowed to deliver tokens.
 */
contract Vendors {

    // Accounts that are allowed to deliver tokens
    address[] public tokenVendors;

    modifier onlyVendor() {
        bool isTokenVendor = false;
        for (uint i = 0; i < tokenVendors.length; i++) {
            isTokenVendor = isTokenVendor || msg.sender == tokenVendors[i];
        }
        require(isTokenVendor);

        _;
    }

    constructor(
        address _tokenVendor1,
        address _tokenVendor2,
        address _tokenVendor3
    )
        internal
    {
        tokenVendors.push(_tokenVendor1);
        tokenVendors.push(_tokenVendor2);
        tokenVendors.push(_tokenVendor3);

        // Vendor address must be set and must be different
        for (uint i = 0; i < tokenVendors.length; i++) {
            require (tokenVendors[i] != 0x0);
            for (uint j = i + 1; j < tokenVendors.length; j++) {
                require (tokenVendors[i] != tokenVendors[j]);
            }
        }
    }
}
