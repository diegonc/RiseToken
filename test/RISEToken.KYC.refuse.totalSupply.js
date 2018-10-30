const truffleAssert = require('truffle-assertions')
const timeTravel = require('./time-travel')

var RiseToken = artifacts.require('./RiseToken.sol')

const toTokens = (balance, decimals) => {
  return Math.floor(balance / Math.pow(10, decimals - 2)) / 100
}

/**
 * Test token buying
 *
 * NOTE: We have to change the timestamp of the next block for testing, so this
 * test only works on ganache and we have to restart ganache after each test run,
 * since it does not revert timestamps.
 */
contract('RiseToken: KYC refused (check total supply)', async (accounts) => {
  var DECIMALS

  it('Get token decimals', async () => {
    let contract = await RiseToken.deployed()

    DECIMALS = (await contract.decimals.call()).toNumber()
  })

  it('Move to roundFourTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.roundFourTime.call()
    await timeTravel.to(time.toNumber() + 1)
  })

  it('Enable sale through contract', async () => {
    let contract = await RiseToken.deployed()

    // Given: Sale is disabled
    assert.equal(false, await contract.saleThroughContractEnabled.call())

    // When: Owner enables sale
    await contract.enableSaleThroughContract(true, { from: accounts[0], value: 200000000000000000 })
    await contract.enableSaleThroughContract(true, { from: accounts[1], value: 200000000000000000 })

    // Then: Sale is enabled
    assert.equal(true, await contract.saleThroughContractEnabled.call())
  })

  it('Simulate Oraclize price update: 10.00', async () => {
    let contract = await RiseToken.deployed()

    // When: Oraclize callback is called
    await contract.__callback([1], "10.00")

    // Then: Exchange rate should be update
    assert.equal(await contract.ETH_USD_EXCHANGE_RATE_IN_CENTS.call(), 1000)
  })

  it('Account 6: Buy with 50 ETH and assume to get 500.00 tokens', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.createTokens({ from: accounts[6], value: 50000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[6])
    assert.equal(toTokens(balance, DECIMALS), 500.00)

    let totalSupply = (await contract.totalSupply()).toNumber()
    assert.equal(toTokens(totalSupply, DECIMALS), 500.00)
  })

  it('Account 7: Buy with 5 ETH and assume to get 50.00 tokens', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.createTokens({ from: accounts[7], value: 5000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[7])
    assert.equal(toTokens(balance, DECIMALS), 50.00)

    let totalSupply = (await contract.totalSupply()).toNumber()
    assert.equal(toTokens(totalSupply, DECIMALS), 550.00)
  })

  it('Account 7: Deliver 100 locked tokens', async () => {
    let contract = await RiseToken.deployed()

    // When:
    let result = await contract.deliverTokens(accounts[7], 10000, [1], false, { from: accounts[2] })

    // Then: Account balance should be 150 token
    let balance = (await contract.balanceOf(accounts[7])).toNumber()
    assert.equal(toTokens(balance, DECIMALS), 150.00)

    let totalSupply = (await contract.totalSupply()).toNumber()
    assert.equal(toTokens(totalSupply, DECIMALS), 650.00)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogDeliverRSE')
  })

  it('Account 7: Refuse KYC (50 tokens)', async () => {
    let contract = await RiseToken.deployed()

    // When:
    let result = await contract.refuseKyc(accounts[7], { from: accounts[5], value: 5000000000000000000 })

    // Then: Account balance should be 100 token
    let balance = (await contract.balanceOf(accounts[7])).toNumber()
    assert.equal(toTokens(balance, DECIMALS), 100.00)

    let totalSupply = (await contract.totalSupply()).toNumber()
    assert.equal(toTokens(totalSupply, DECIMALS), 600.00)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogKycRefused')
  })

  it('Account 7: Cancel Delivery (100 tokens)', async () => {
    let contract = await RiseToken.deployed()

    // When:
    let result = await contract.cancelDelivery([1], 10000, accounts[7], { from: accounts[5] })

    // Then: Account balance should be 0 token
    let balance = (await contract.balanceOf(accounts[7])).toNumber()
    assert.equal(toTokens(balance, DECIMALS), 0.00)

    let totalSupply = (await contract.totalSupply()).toNumber()
    assert.equal(toTokens(totalSupply, DECIMALS), 500.00)

    truffleAssert.eventEmitted(result, 'Transfer')
    truffleAssert.eventEmitted(result, 'LogCancelDelivery')
  })
})
