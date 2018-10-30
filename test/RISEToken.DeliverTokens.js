const truffleAssert = require('truffle-assertions')
const timeTravel = require('./time-travel')

var RiseToken = artifacts.require('./RiseToken.sol')

/**
 * Test token delivery
 *
 * NOTE: We have to change the timestamp of the next block for testing, so this
 * test only works on ganache and we have to restart ganache after each test run,
 * since it does not revert timestamps.
 */
contract('RiseToken: Deliver Tokens', async (accounts) => {

  it('Move to fundingStartTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.fundingStartTime.call()
    await timeTravel.to(time.toNumber())
  })

  it('Deliver 1 unlocked token to account 8', async () => {
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

  it('Deliver 40 locked tokens to account 9', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()

    // When:
    let result = await contract.deliverTokens(accounts[9], 4000, [1], false, { from: accounts[2] })

    // Then: Account balance should be 42 token
    let balance = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(40 * Math.pow(10, decimals), balance)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogDeliverRSE')
  })

  it('Deliver tokens batch', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()

    // When:
    let result = await contract.deliverTokensBatch(
      [accounts[8], accounts[9]],
      [100, 200],
      [[1], [2]],
      [true, false],
      { from: accounts[2] }
    )

    // Then: Account balance should be 42 token
    let balance8 = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(2 * Math.pow(10, decimals), balance8)

    let balance9 = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(42 * Math.pow(10, decimals), balance9)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogDeliverRSE')
  })

  it('Move to fundingEndTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.fundingEndTime.call()
    await timeTravel.to(time.toNumber() + 1)
  })

  it('Finalize contract', async () => {
    let contract = await RiseToken.deployed()

    await contract.finalize({ from: accounts[0] })
    await contract.finalize({ from: accounts[1] })

    // Then: Contract should be in Finalized again
    let state = await contract.state.call()
    assert.equal(1, state.toNumber())
  })

  it('Approve KYC of account 8 and 9', async () => {
    let contract = await RiseToken.deployed()

    await contract.unlockKyc(accounts[8], { from: accounts[5] })
    await contract.unlockKyc(accounts[9], { from: accounts[5] })
  })

  it('Send 1 token from account 8 to account 9', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()
    let amount = 1 * Math.pow(10, decimals)

    // When:
    let result = await contract.transfer(accounts[9], amount, { from: accounts[8] })

    // Then: Account balance should be 43 token
    let balanceAccount8 = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(1 * Math.pow(10, decimals), balanceAccount8)

    let balanceAccount9 = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(43 * Math.pow(10, decimals), balanceAccount9)

    truffleAssert.eventEmitted(result, 'Transfer')
  })

  it('Send 1 unlocked token from account 9 to account 8', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()
    let amount = 1 * Math.pow(10, decimals)

    // When:
    let result = await contract.transfer(accounts[8], amount, { from: accounts[9] })

    // Then: Account balance should be 42 token
    let balanceAccount8 = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(2 * Math.pow(10, decimals), balanceAccount8)

    let balanceAccount9 = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(42 * Math.pow(10, decimals), balanceAccount9)

    truffleAssert.eventEmitted(result, 'Transfer')
  })

  it('Sending 42 locked tokens from account 9 to account 8 should fail', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()
    let amount = 1 * Math.pow(10, decimals)

    // When:
    truffleAssert.fails(
      contract.transfer(accounts[8], amount, { from: accounts[9] })
    )

    // Then: Account balance should be unchanged
    let balanceAccount8 = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(2 * Math.pow(10, decimals), balanceAccount8)

    let balanceAccount9 = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(42 * Math.pow(10, decimals), balanceAccount9)
  })

  it('Move to ccReleaseTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.lockedReleaseTime.call()
    await timeTravel.to(time.toNumber() + 1)
  })

  it('Sending 42 locked tokens from account 9 to account 8', async () => {
    let contract = await RiseToken.deployed()

    // Given:
    let decimals = (await contract.decimals.call()).toNumber()
    let amount = 42 * Math.pow(10, decimals)

    // When:
    contract.transfer(accounts[8], amount, { from: accounts[9] })

    // Then: Account balance should be 44 token
    let balanceAccount8 = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(44 * Math.pow(10, decimals), balanceAccount8)

    let balanceAccount9 = (await contract.balanceOf(accounts[9])).toNumber()
    assert.equal(0 * Math.pow(10, decimals), balanceAccount9)
  })
})
