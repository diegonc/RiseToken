const truffleAssert = require('truffle-assertions')
const timeTravel = require('./time-travel')

var RiseToken = artifacts.require('./RiseToken.sol')
var TestFund = artifacts.require('./TestFund.sol')

contract('RiseToken: Fund', async (accounts) => {
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

  it('Deliver 100 unlocked token to account 8', async () => {
    let contract = await RiseToken.deployed()

    // When: Delivering 100 tokens
    let result = await contract.deliverTokens(accounts[8], 10000, [1], true, { from: accounts[2] })

    // Then: Account balance should be 100 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(100 * Math.pow(10, DECIMALS), balance)
  })

  it('Deliver 50 locked token to account 8', async () => {
    let contract = await RiseToken.deployed()

    // When: Delivering additional 50 tokens
    let result = await contract.deliverTokens(accounts[8], 5000, [1], false, { from: accounts[2] })

    // Then: Account balance should be 150 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(150 * Math.pow(10, DECIMALS), balance)
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

  it('Approve KYC of account 8', async () => {
    let contract = await RiseToken.deployed()

    await contract.unlockKyc(accounts[8], { from: accounts[5] })
  })

  it('Cannot move tokens to non-registered fund', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    truffleAssert.fails(
      contract.moveTokensToFund(fund.address, 1 * Math.pow(10, DECIMALS), { from: accounts[8] })
    )
  })

  it('Register TestFund', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // Given: Fund not yet registered
    assert.equal(false, await contract.isRiseFund.call(fund.address))

    // When: Admins add fund
    await contract.addFond(fund.address, { from: accounts[0] })
    await contract.addFond(fund.address, { from: accounts[1] })

    // Then: Fund should be added successfully
    assert.equal(true, await contract.isRiseFund.call(fund.address))
  })

  it('Move 10 (locked) tokens to fund', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // When: Moving 100 tokens to fund
    await contract.moveTokensToFund(fund.address, 10 * Math.pow(10, DECIMALS), { from: accounts[8] })

    // Then: Account balance should be 140 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(140 * Math.pow(10, DECIMALS), balance)

    // Then: 10 locked tokens should have been moved to the fund
    let lockedTokens = (await contract.lockedTokens.call(accounts[8])).toNumber()
    assert.equal(40 * Math.pow(10, DECIMALS), lockedTokens)
  })

  it('Move 90 tokens to fund (40 locked and 50 unlocked)', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // When: Moving 90 tokens to fund
    await contract.moveTokensToFund(fund.address, 90 * Math.pow(10, DECIMALS), { from: accounts[8] })

    // Then: Account balance should be 50 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(50 * Math.pow(10, DECIMALS), balance)

    // Then: Locked tokens should have been moved to the fund
    let lockedTokens = (await contract.lockedTokens.call(accounts[8])).toNumber()
    assert.equal(0 * Math.pow(10, DECIMALS), lockedTokens)
  })

  it('Transfer 50 (unlocked) tokens to account 9', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // When: Transfering 50 tokens
    await contract.transfer(accounts[9], 50 * Math.pow(10, DECIMALS), { from: accounts[8] })

    // Then: Account balance should be 0 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(0 * Math.pow(10, DECIMALS), balance)
  })

  it('Payout 10 (locked) tokens from fund', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // When: Transfering 10 tokens
    await fund.payout(contract.address, accounts[8], 10 * Math.pow(10, DECIMALS), { from: accounts[8] })

    // Then: Account balance should be 10 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(10 * Math.pow(10, DECIMALS), balance)

    // Then: Locked tokens should be 10
    let lockedTokens = (await contract.lockedTokens.call(accounts[8])).toNumber()
    assert.equal(10 * Math.pow(10, DECIMALS), lockedTokens)
  })

  it('Payout 80 tokens from fund (40 locked)', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // When: Transfering 80 tokens
    await fund.payout(contract.address, accounts[8], 80 * Math.pow(10, DECIMALS), { from: accounts[8] })

    // Then: Account balance should be 90 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(90 * Math.pow(10, DECIMALS), balance)

    // Then: Locked tokens should be 50
    let lockedTokens = (await contract.lockedTokens.call(accounts[8])).toNumber()
    assert.equal(50 * Math.pow(10, DECIMALS), lockedTokens)
  })

  it('Payout 10 tokens from fund', async () => {
    let contract = await RiseToken.deployed()
    let fund = await TestFund.deployed()

    // When: Transfering 10 tokens
    await fund.payout(contract.address, accounts[8], 10 * Math.pow(10, DECIMALS), { from: accounts[8] })

    // Then: Account balance should be 100 token
    let balance = (await contract.balanceOf(accounts[8])).toNumber()
    assert.equal(100 * Math.pow(10, DECIMALS), balance)

    // Then: Locked tokens should be 50
    let lockedTokens = (await contract.lockedTokens.call(accounts[8])).toNumber()
    assert.equal(50 * Math.pow(10, DECIMALS), lockedTokens)
  })
})
