const truffleAssert = require('truffle-assertions')
const timeTravel = require('./time-travel')

var RiseToken = artifacts.require('./RiseToken.sol')

contract('RiseToken: Token vendors', async (accounts) => {
  it('Move to fundingStartTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.fundingStartTime.call()
    await timeTravel.to(time.toNumber())
  })

  it('Ensure that tokenVendor 1 can deliver tokens', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()

    // When:
    let result = await contract.deliverTokens(accounts[8], 100, [1], true, { from: accounts[2] })

    // Then: Account balance should be 1 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(1 * Math.pow(10, decimals), balance)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogDeliverRSE')
  })

  it('Ensure that tokenVendor 2 can deliver tokens', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()

    // When:
    let result = await contract.deliverTokens(accounts[9], 100, [1], true, { from: accounts[3] })

    // Then: Account balance should be 1 token
    let balance = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(1 * Math.pow(10, decimals), balance)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogDeliverRSE')
  })

  it('Ensure that tokenVendor 3 can deliver tokens', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()

    // When:
    let result = await contract.deliverTokens(accounts[0], 100, [1], true, { from: accounts[4] })

    // Then: Account balance should be 1 token
    let balance = (await contract.balanceOf(accounts[0])).toNumber()
    assert.equal(1 * Math.pow(10, decimals), balance)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogDeliverRSE')
  })

  it('Ensure that non-vendor cannot deliver tokens', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()

    // When:
    truffleAssert.fails(
      contract.deliverTokens(accounts[1], 100, [1], true, { from: accounts[5] })
    )

    // Then: Account balance should be 0 token
    let balance = (await contract.balanceOf(accounts[1])).toNumber()
    assert.equal(0 * Math.pow(10, decimals), balance)
  })
})
