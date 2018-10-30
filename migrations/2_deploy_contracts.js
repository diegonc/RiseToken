var RiseToken = artifacts.require('../contracts/RiseToken.sol')
var TestFund = artifacts.require('../contracts/test/TestFund.sol')

var start = new Date().getTime() / 1000 + 60 * 60
module.exports = function (deployer, network, accounts) {
  deployer.deploy(RiseToken,
    start,
    accounts[0], // admin
    accounts[1], // admin
    accounts[2], // vendor
    accounts[3], // vendor
    accounts[4], // vendor
    accounts[5], // KYC
    accounts[6], // KYC
    accounts[7], // KYC
    { gas: 6000000 }
  ),
  deployer.deploy(TestFund,
    { gas: 6000000 }
  )
}
