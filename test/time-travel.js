const id = 0
const jsonrpc = '2.0'

const send = (method, params = []) =>
  web3.currentProvider.send({ id, jsonrpc, method, params })

const timeTravel = async seconds => {
  await send('evm_increaseTime', [seconds])
  await send('evm_mine')
}

const timeTravelTo = async timestamp => {
  let blockNumber = web3.eth.blockNumber;
  let current = web3.eth.getBlock(blockNumber).timestamp;
  await timeTravel(timestamp - current)
}

module.exports = {
  to: timeTravelTo
}
