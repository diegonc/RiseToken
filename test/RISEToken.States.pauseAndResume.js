const truffleAssert = require('truffle-assertions')

var RiseToken = artifacts.require('./RiseToken.sol')

contract('RiseToken: Pause and resume contract', async (accounts) => {
  let Fundraising = 0
  // let Finalized = 1
  let Paused = 2

  it('Pausing contract by non-owner fails', async () => {
    let contract = await RiseToken.deployed()

    // Given: contract is not paused
    assert.equal(Fundraising, (await contract.state.call()).toNumber())

    // When: Non-Owner tries to pause contract
    truffleAssert.fails(
      contract.pause({ from: accounts[3] })
    )

    // Then: Call should fail and contract should not be paused
    let state = await contract.state.call()
    assert.equal(Fundraising, state.toNumber())
  })

  it('Owner pauses contract successfully', async () => {
    let contract = await RiseToken.deployed()

    // Given: contract is not paused
    assert.equal(Fundraising, (await contract.state.call()).toNumber())

    // When: Owner pauses contract
    await contract.pause({ from: accounts[0] })
    await contract.pause({ from: accounts[1] })

    // Then: Contract should be Paused
    let state = await contract.state.call()
    assert.equal(Paused, state.toNumber())
  })

  it('Resuming contract by non-owner fails', async () => {
    let contract = await RiseToken.deployed()

    // Given: contract is paused
    assert.equal(Paused, (await contract.state.call()).toNumber())

    // When: Non-Owner tries to proceed contract
    truffleAssert.fails(
      contract.proceed({ from: accounts[3] })
    )

    // Then: Call should fail and contract should still be paused
    let state = await contract.state.call()
    assert.equal(Paused, state.toNumber())
  })

  it('Owner resumes contract successfully', async () => {
    let contract = await RiseToken.deployed()

    // Given: contract is paused
    assert.equal(Paused, (await contract.state.call()).toNumber())

    // When: Owner proceeds contract
    await contract.proceed({ from: accounts[0] })
    await contract.proceed({ from: accounts[1] })

    // Then: Contract should be in Fundraising again
    let state = await contract.state.call()
    assert.equal(Fundraising, state.toNumber())
  })
})
