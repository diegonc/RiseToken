var RiseToken = artifacts.require('./RiseToken.sol')

contract('RiseToken: Init', async (accounts) => {
  it('Test Deploy', async () => {
    let contract = await RiseToken.deployed()
    assert(contract)
  })
})
