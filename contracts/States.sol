pragma solidity ^0.4.25;

import "./Ownable.sol";

/**
 * Contract state functionality for a contract.
 *
 * Allows to move the contract from a Fundraising to a Finalized state.
 * Additionaly, the contract can be set into paused mode.
 */
contract States is Ownable {

    // Contracts current state (Fundraising, Finalized, Paused)
    ContractState public state;

    // State of the contract before pause (if currently paused)
    ContractState private savedState;

    // Whether tokens can be delivered by the team to users.
    // Once set to false the delivery is over.
    bool private deliverable = true;

    // Additional helper structs
    enum ContractState { Fundraising, Finalized, Paused }

    constructor()
        internal
    {
        state = ContractState.Fundraising;
        savedState = ContractState.Fundraising;
    }

    modifier isFinalized() {
        require(state == ContractState.Finalized);
        _;
    }

    modifier isFundraising() {
        require(state == ContractState.Fundraising);
        _;
    }

    modifier isPaused() {
        require(state == ContractState.Paused);
        _;
    }

    modifier notPaused() {
        require(state != ContractState.Paused);
        _;
    }

    modifier isFundraisingIgnorePaused() {
        require(state == ContractState.Fundraising || (state == ContractState.Paused && savedState == ContractState.Fundraising));
        _;
    }

    modifier tokensDeliverable() {
        require(deliverable);
        _;
    }

    /**
     * Pauses the contract.
     *
     * Only both admins calling this method can pause the contract
     */
    function pause()
        external
        notPaused // Prevent the contract getting stuck in the Paused state
        onlyOwner
    {
        // Move the contract to Paused state
        savedState = state;
        state = ContractState.Paused;
    }

    /**
     * Proceeds with the contract.
     *
     * Only both admins calling this method can proceed with the contract
     */
    function proceed()
        external
        isPaused
        onlyOwner
    {
        // Move the contract to the previous state
        state = savedState;
    }

    /**
     * Finalize the contract once and for all.
     *
     * Only both admins calling this method can finalize the contract
     */
    function finalizeFundraising()
        internal
        notPaused
        onlyOwner
    {
        // Move the contract to Finalized state
        state = ContractState.Finalized;
        savedState = ContractState.Finalized;
    }

    /**
     * End the token delivery process once and for all.
     *
     * Only both admins calling this method can finalize the contract
     */
    function finalizeTokenDelivery()
        external
        onlyOwner
    {
        deliverable = false;
    }
}
