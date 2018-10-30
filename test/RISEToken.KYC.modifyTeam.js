const truffleAssert = require('truffle-assertions')

var RiseToken = artifacts.require('./RiseToken.sol')

contract('RiseToken: Modify KYC team', async (accounts) => {
  it('Adding member to KYC team by non-owner fails', async () => {
    let contract = await RiseToken.deployed()

    // Given: Account 8 is not part of KYC team
    assert.equal(false, await contract.isKycTeam.call(accounts[8]))

    // When: Non-Owner adds KYC member
    truffleAssert.fails(
      contract.addToKycTeam(accounts[8], { from: accounts[3] })
    )

    // Then: Call should fail and no new member added
    assert.equal(false, await contract.isKycTeam.call(accounts[8]))
  })

  it('Owner adds member to KYC team successfully', async () => {
    let contract = await RiseToken.deployed()

    // Given: Account 8 is not part of KYC team
    assert.equal(false, await contract.isKycTeam.call(accounts[8]))

    // When: Owner adds KYC member
    await contract.addToKycTeam(accounts[8], { from: accounts[0] })
    await contract.addToKycTeam(accounts[8], { from: accounts[1] })

    // Then: Member should be part of KYC team
    assert.equal(true, await contract.isKycTeam.call(accounts[8]))
  })

  it('Removing member from KYC team by non-owner fails', async () => {
    let contract = await RiseToken.deployed()

    // Given: Account 8 is part of KYC team
    assert.equal(true, await contract.isKycTeam.call(accounts[8]))

    // When: Non-Owner removes KYC member
    truffleAssert.fails(
      contract.removeFromKycTeam(accounts[8], { from: accounts[3] })
    )

    // Then: Call should fail and member should still be in KYC team
    assert.equal(true, await contract.isKycTeam.call(accounts[8]))
  })

  it('Owner removed member from KYC team successfully', async () => {
    let contract = await RiseToken.deployed()

    // Given: Account 8 is part of KYC team
    assert.equal(true, await contract.isKycTeam.call(accounts[8]))

    // When: Owner removes KYC member
    await contract.removeFromKycTeam(accounts[8], { from: accounts[0] })
    await contract.removeFromKycTeam(accounts[8], { from: accounts[1] })

    // Then: Member should not be part of KYC team anymore
    assert.equal(false, await contract.isKycTeam.call(accounts[8]))
  })
})
