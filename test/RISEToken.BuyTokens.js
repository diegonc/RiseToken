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
contract('RiseToken: Buy Tokens', async (accounts) => {
  var DECIMALS

  it('Get token decimals', async () => {
    let contract = await RiseToken.deployed()

    DECIMALS = (await contract.decimals.call()).toNumber()
  })

  it('Move to fundingStartTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.fundingStartTime.call()
    await timeTravel.to(time.toNumber())
  })

  it('Ensure buying via ETH is not possible by default', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    truffleAssert.fails(
      contract.createTokens({ from: accounts[8], value: 100000000000000000 })
    )

    // Then: Buy should fail and balance not changed
    assert.equal(0, await contract.balanceOf(accounts[8]))
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

  it('Ensure buying is not possible until exchange rate is updated', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    truffleAssert.fails(
      contract.createTokens({ from: accounts[8], value: 100000000000000000 })
    )

    // Then: Tokens delivered
    assert.equal(0, await contract.balanceOf(accounts[8]))
  })

  it('Simulate Oraclize price update: 203.38', async () => {
    let contract = await RiseToken.deployed()

    // When: Oraclize callback is called
    await contract.__callback([0], "203.38")

    // Then: Exchange rate should be update
    assert.equal(await contract.ETH_USD_EXCHANGE_RATE_IN_CENTS.call(), 20338)
  })

  it('Simulate Oraclize price update: 200.00', async () => {
    let contract = await RiseToken.deployed()

    // When: Oraclize callback is called
    await contract.__callback([1], "200.00")

    // Then: Exchange rate should be update
    assert.equal(await contract.ETH_USD_EXCHANGE_RATE_IN_CENTS.call(), 20000)
  })

  it('Buy with 1 ETH and assume to get 285.71 tokens', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.createTokens({ from: accounts[9], value: 1000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[9])
    assert.equal(toTokens(balance, DECIMALS), 285.71)
  })

  it('Move to roundTwoTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.roundTwoTime.call()
    await timeTravel.to(time.toNumber() + 1)
  })

  it('Buy with 1 ETH and assume to get 250.00 tokens', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.createTokens({ from: accounts[8], value: 1000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[8])
    assert.equal(toTokens(balance, DECIMALS), 250.00)
  })

  it('Move to roundThreeTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.roundThreeTime.call()
    await timeTravel.to(time.toNumber() + 1)
  })

  it('Buy with 1 ETH and assume to get 222.22 tokens', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.createTokens({ from: accounts[7], value: 1000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[7])
    assert.equal(toTokens(balance, DECIMALS), 222.22)
  })

  it('Move to roundFourTime', async () => {
    let contract = await RiseToken.deployed()

    let time = await contract.roundFourTime.call()
    await timeTravel.to(time.toNumber() + 1)
  })

  it('Buy with 1 ETH and assume to get 200.00 tokens', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.createTokens({ from: accounts[6], value: 1000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[6])
    assert.equal(toTokens(balance, DECIMALS), 200.00)
  })

  it('Buy with 1 ETH via sendTransaction()', async () => {
    let contract = await RiseToken.deployed()

    // When: Buying tokens
    await contract.sendTransaction({ from: accounts[5], value: 1000000000000000000 })

    // Then: Tokens delivered
    let balance = await contract.balanceOf(accounts[5])
    assert.equal(toTokens(balance, DECIMALS), 200.00)
  })

  it('Check that admin can retrieve ETH from contract', async () => {
    let contract = await RiseToken.deployed()

    // Given: Current balance of contract and account 2 is
    let accountBalance = web3.eth.getBalance(accounts[2]).toNumber()
    let contractBalance = web3.eth.getBalance(contract.address).toNumber()

    // When: Retrieving ETH
    let amount = 5000000000000000000
    await contract.retrieveEth(accounts[2], amount, { from: accounts[0] })
    await contract.retrieveEth(accounts[2], amount, { from: accounts[1] })

    // Then: Sale is enabled
    let newAccountBalance = web3.eth.getBalance(accounts[2]).toNumber()
    let newContractBalance = web3.eth.getBalance(contract.address).toNumber()
    assert.equal(newAccountBalance, accountBalance + amount)
    assert.equal(newContractBalance, contractBalance - amount)
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
})
