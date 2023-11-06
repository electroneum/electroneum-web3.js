/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/

import { Web3ContextInitOptions, Web3PromiEvent } from '@etn-sc/web3-core';
import {
	AccessListResult,
	BlockNumberOrTag,
	EthExecutionAPI,
	HexString,
	Numbers,
	TransactionReceipt,
	NonPayableCallOptions,
	PayableCallOptions,
	DataFormat,
	DEFAULT_RETURN_FORMAT,
	FormatType,
} from '@etn-sc/web3-types';
import { NewHeadsSubscription, SendTransactionEvents } from '@etn-sc/web3-eth';
import { LogsSubscription } from './log_subscription.js';

export type NonPayableTxOptions = NonPayableCallOptions;
export type PayableTxOptions = PayableCallOptions;
export { ContractAbiWithSignature, EventLog, ContractOptions } from '@etn-sc/web3-types';

export interface ContractEventOptions {
	/**
	 * Let you filter events by indexed parameters, e.g. `{filter: {myNumber: [12,13]}}` means all events where `myNumber` is `12` or `13`.
	 */
	filter?: Record<string, unknown>;
	/**
	 * The block number (greater than or equal to) from which to get events on. Pre-defined block numbers as `earliest`, `latest`, `pending`, `safe` or `finalized` can also be used. For specific range use {@link Contract.getPastEvents}.
	 */
	fromBlock?: BlockNumberOrTag;
	/**
	 * This allows to manually set the topics for the event filter. If given the filter property and event signature, (topic[0]) will not be set automatically. Each topic can also be a nested array of topics that behaves as `or` operation between the given nested topics.
	 */
	topics?: string[];
}

export interface NonPayableMethodObject<Inputs = unknown[], Outputs = unknown[]> {
	arguments: Inputs;
	/**
	 * This will call a method and execute its smart contract method in the EVM without sending any transaction. Note calling cannot alter the smart contract state.
	 *
	 * ```ts
	 * // using the promise
	 * const result = await myContract.methods.myMethod(123).call({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'});
	 *
	 * // MULTI-ARGUMENT RETURN:
	 * // Solidity
	 * contract MyContract {
	 *   function myFunction() returns(uint256 myNumber, string myString) {
	 *       return (23456, "Hello!%");
	 *   }
	 * }
	 *
	 * // web3.js
	 * var MyContract = new web3.eth.Contract(abi, address);
	 * const result = MyContract.methods.myFunction().call()
	 * console.log(result)
	 * > Result {
	 *   myNumber: '23456',
	 *   myString: 'Hello!%',
	 *   0: '23456', // these are here as fallbacks if the name is not know or given
	 *   1: 'Hello!%'
	 * }
	 *
	 *
	 * // SINGLE-ARGUMENT RETURN:
	 * // Solidity
	 * contract MyContract {
	 *   function myFunction() returns(string myString) {
	 *       return "Hello!%";
	 *   }
	 * }
	 *
	 * // web3.js
	 * const MyContract = new web3.eth.Contract(abi, address);
	 * const result = await MyContract.methods.myFunction().call();
	 * console.log(result);
	 * > "Hello!%"
	 * ```
	 *
	 * @param tx - The options used for calling.
	 * @param block - If you pass this parameter it will not use the default block set with contract.defaultBlock. Pre-defined block numbers as `earliest`, `latest`, `pending`, `safe` or `finalized can also be used. Useful for requesting data from or replaying transactions in past blocks.
	 * @returns - The return value(s) of the smart contract method. If it returns a single value, it’s returned as is. If it has multiple return values they are returned as an object with properties and indices.
	 */

	call<SpecialOutput = Outputs>(
		tx?: NonPayableCallOptions,
		block?: BlockNumberOrTag,
	): Promise<SpecialOutput>;

	/**
	 * This will send a transaction to the smart contract and execute its method. Note this can alter the smart contract state.
	 *
	 * ```ts
	 * await myContract.methods.myMethod(123).send({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'});
	 *
	 * const receipt = await myContract.methods.myMethod(123).send({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'});
	 *
	 *
	 * // using the event emitter
	 * const sendObj = myContract.methods.myMethod(123).send({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'})
	 * sendObj.on('transactionHash', function(hash){
	 *   ...
	 * });
	 *
	 * sendObj.on('confirmation', function(confirmationNumber, receipt){
	 *   ...
	 * });
	 *
	 * sendObj.on('receipt', function(receipt){
	 *   // receipt example
	 *   console.log(receipt);
	 *   > {
	 *       "transactionHash": "0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b",
	 *       "transactionIndex": 0,
	 *       "blockHash": "0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46",
	 *       "blockNumber": 3,
	 *       "contractAddress": "0x11f4d0A3c12e86B4b5F39B213F7E19D048276DAe",
	 *       "cumulativeGasUsed": 314159,
	 *       "gasUsed": 30234,
	 *       "events": {
	 *           "MyEvent": {
	 *               returnValues: {
	 *                   myIndexedParam: 20,
	 *                   myOtherIndexedParam: '0x123456789...',
	 *                   myNonIndexParam: 'My String'
	 *               },
	 *               raw: {
	 *                   data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
	 *                   topics: ['0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7', '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
	 *               },
	 *               event: 'MyEvent',
	 *               signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
	 *               logIndex: 0,
	 *               transactionIndex: 0,
	 *               transactionHash: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
	 *               blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
	 *               blockNumber: 1234,
	 *               address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
	 *           },
	 *           "MyOtherEvent": {
	 *               ...
	 *           },
	 *           "MyMultipleEvent":[{...}, {...}] // If there are multiple of the same event, they will be in an array
	 *       }
	 *   }
	 * });
	 *
	 * sendObj.on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
	 *   ...
	 * });
	 * ```
	 *
	 * @param tx - The options used for sending.
	 * @returns - Returns a {@link PromiEvent} resolved with transaction receipt.
	 */
	send(
		tx?: NonPayableTxOptions,
	): Web3PromiEvent<
		FormatType<TransactionReceipt, typeof DEFAULT_RETURN_FORMAT>,
		SendTransactionEvents<typeof DEFAULT_RETURN_FORMAT>
	>;

	/**
	 * Returns the amount of gas consumed by executing the method locally without creating a new transaction on the blockchain.
	 * The returned amount can be used as a gas estimate for executing the transaction publicly. The actual gas used can be
	 * different when sending the transaction later, as the state of the smart contract can be different at that time.
	 *
	 * ```ts
	 * const gasAmount = await myContract.methods.myMethod(123).estimateGas({gas: 5000000});
	 * if(gasAmount == 5000000) {
	 *   console.log('Method ran out of gas');
	 * }
	 * ```
	 *
	 * @param options  - The options used for calling
	 * @param returnFormat - The data format you want the output in.
	 * @returns - The gas amount estimated.
	 */
	estimateGas<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
		options?: NonPayableCallOptions,
		returnFormat?: ReturnFormat,
	): Promise<FormatType<Numbers, ReturnFormat>>;

	/**
	 * Encodes the ABI for this method. The resulting hex string is 32-bit function signature hash plus the passed parameters in Solidity tightly packed format.
	 * This can be used to send a transaction, call a method, or pass it into another smart contract’s method as arguments.
	 * Set the data field on `web3.eth.sendTransaction` options as the encodeABI() result and it is the same as calling the contract method with `contract.myMethod.send()`.
	 *
	 * Some use cases for encodeABI() include: preparing a smart contract transaction for a multi signature wallet,
	 * working with offline wallets and cold storage and creating transaction payload for complex smart contract proxy calls.
	 *
	 * @returns - The encoded ABI byte code to send via a transaction or call.
	 */
	encodeABI(): string;

	/**
	 * This method generates an access list for a transaction. You must specify a `from` address and `gas` if it’s not specified in options.
	 *
	 * @param options - The options used for createAccessList.
	 * @param block - If you pass this parameter it will not use the default block set with contract.defaultBlock. Pre-defined block numbers as `earliest`, `latest`, `pending`, `safe` or `finalized can also be used. Useful for requesting data from or replaying transactions in past blocks.
	 * @returns The returned data of the createAccessList,  e.g. The generated access list for transaction.
	 *
	 * ```ts
	 *  const result = await MyContract.methods.myFunction().createAccessList();
	 *  console.log(result);
	 *
	 * > {
	 *  "accessList": [
	 *     {
	 *       "address": "0x15859bdf5aff2080a9968f6a410361e9598df62f",
	 *       "storageKeys": [
	 *         "0x0000000000000000000000000000000000000000000000000000000000000000"
	 *       ]
	 *     }
	 *   ],
	 *   "gasUsed": "0x7671"
	 * }
	 * ```
	 */
	createAccessList(
		tx?: NonPayableCallOptions,
		block?: BlockNumberOrTag,
	): Promise<AccessListResult>;
}

export interface PayableMethodObject<Inputs = unknown[], Outputs = unknown[]> {
	arguments: Inputs;
	/**
	 * Will call a method and execute its smart contract method in the EVM without sending any transaction. Note calling cannot alter the smart contract state.
	 *
	 * ```ts
	 * // using the promise
	 * const result = await myContract.methods.myMethod(123).call({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'});
	 *
	 * // MULTI-ARGUMENT RETURN:
	 * // Solidity
	 * contract MyContract {
	 *   function myFunction() returns(uint256 myNumber, string myString) {
	 *       return (23456, "Hello!%");
	 *   }
	 * }
	 *
	 * // web3.js
	 * var MyContract = new web3.eth.Contract(abi, address);
	 * const result = MyContract.methods.myFunction().call()
	 * console.log(result)
	 * > Result {
	 *   myNumber: '23456',
	 *   myString: 'Hello!%',
	 *   0: '23456', // these are here as fallbacks if the name is not know or given
	 *   1: 'Hello!%'
	 * }
	 *
	 *
	 * // SINGLE-ARGUMENT RETURN:
	 * // Solidity
	 * contract MyContract {
	 *   function myFunction() returns(string myString) {
	 *       return "Hello!%";
	 *   }
	 * }
	 *
	 * // web3.js
	 * const MyContract = new web3.eth.Contract(abi, address);
	 * const result = await MyContract.methods.myFunction().call();
	 * console.log(result);
	 * > "Hello!%"
	 * ```
	 *
	 * @param tx - The options used for calling.
	 * @param block - If you pass this parameter it will not use the default block set with contract.defaultBlock. Pre-defined block numbers as `earliest`, `latest`, `pending`, `safe` or `finalized can also be used. Useful for requesting data from or replaying transactions in past blocks.
	 * @returns - The return value(s) of the smart contract method. If it returns a single value, it’s returned as is. If it has multiple return values they are returned as an object with properties and indices.
	 */
	call<SpecialOutput = Outputs>(
		tx?: PayableCallOptions,
		block?: BlockNumberOrTag,
	): Promise<SpecialOutput>;

	/**
	 * Will send a transaction to the smart contract and execute its method. Note this can alter the smart contract state.
	 *
	 * ```ts
	 * await myContract.methods.myMethod(123).send({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'});
	 *
	 * const receipt = await myContract.methods.myMethod(123).send({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'});
	 *
	 *
	 * // using the event emitter
	 * const sendObj = myContract.methods.myMethod(123).send({from: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'})
	 * sendObj.on('transactionHash', function(hash){
	 *   ...
	 * });
	 *
	 * sendObj.on('confirmation', function(confirmationNumber, receipt){
	 *   ...
	 * });
	 *
	 * sendObj.on('receipt', function(receipt){
	 *   // receipt example
	 *   console.log(receipt);
	 *   > {
	 *       "transactionHash": "0x9fc76417374aa880d4449a1f7f31ec597f00b1f6f3dd2d66f4c9c6c445836d8b",
	 *       "transactionIndex": 0,
	 *       "blockHash": "0xef95f2f1ed3ca60b048b4bf67cde2195961e0bba6f70bcbea9a2c4e133e34b46",
	 *       "blockNumber": 3,
	 *       "contractAddress": "0x11f4d0A3c12e86B4b5F39B213F7E19D048276DAe",
	 *       "cumulativeGasUsed": 314159,
	 *       "gasUsed": 30234,
	 *       "events": {
	 *           "MyEvent": {
	 *               returnValues: {
	 *                   myIndexedParam: 20,
	 *                   myOtherIndexedParam: '0x123456789...',
	 *                   myNonIndexParam: 'My String'
	 *               },
	 *               raw: {
	 *                   data: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
	 *                   topics: ['0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7', '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385']
	 *               },
	 *               event: 'MyEvent',
	 *               signature: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
	 *               logIndex: 0,
	 *               transactionIndex: 0,
	 *               transactionHash: '0x7f9fade1c0d57a7af66ab4ead79fade1c0d57a7af66ab4ead7c2c2eb7b11a91385',
	 *               blockHash: '0xfd43ade1c09fade1c0d57a7af66ab4ead7c2c2eb7b11a91ffdd57a7af66ab4ead7',
	 *               blockNumber: 1234,
	 *               address: '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe'
	 *           },
	 *           "MyOtherEvent": {
	 *               ...
	 *           },
	 *           "MyMultipleEvent":[{...}, {...}] // If there are multiple of the same event, they will be in an array
	 *       }
	 *   }
	 * });
	 *
	 * sendObj.on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
	 *   ...
	 * });
	 * ```
	 *
	 * @param tx - The options used for sending.
	 * @returns - Returns a {@link PromiEvent} object resolved with transaction receipt.
	 */
	send(
		tx?: PayableTxOptions,
	): Web3PromiEvent<
		FormatType<TransactionReceipt, typeof DEFAULT_RETURN_FORMAT>,
		SendTransactionEvents<typeof DEFAULT_RETURN_FORMAT>
	>;

	/**
	 * Returns the amount of gas consumed by executing the method locally without creating a new transaction on the blockchain.
	 * The returned amount can be used as a gas estimate for executing the transaction publicly. The actual gas used can be
	 * different when sending the transaction later, as the state of the smart contract can be different at that time.
	 *
	 * ```ts
	 * const gasAmount = await myContract.methods.myMethod(123).estimateGas({gas: 5000000});
	 * if(gasAmount == 5000000) {
	 *   console.log('Method ran out of gas');
	 * }
	 * ```
	 *
	 * @param options  - The options used for calling
	 * @param returnFormat - The data format you want the output in.
	 * @returns - The gas amount estimated.
	 */
	estimateGas<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
		options?: PayableCallOptions,
		returnFormat?: ReturnFormat,
	): Promise<FormatType<Numbers, ReturnFormat>>;

	/**
	 * Encodes the ABI for this method. The resulting hex string is 32-bit function signature hash plus the passed parameters in Solidity tightly packed format.
	 * This can be used to send a transaction, call a method, or pass it into another smart contract’s method as arguments.
	 * Set the data field on `web3.eth.sendTransaction` options as the encodeABI() result and it is the same as calling the contract method with `contract.myMethod.send()`.
	 *
	 * Some use cases for encodeABI() include: preparing a smart contract transaction for a multi signature wallet,
	 * working with offline wallets and cold storage and creating transaction payload for complex smart contract proxy calls.
	 *
	 * @returns - The encoded ABI byte code to send via a transaction or call.
	 */
	encodeABI(): HexString;

	/**
	 * This method generates an access list for a transaction. You must specify a `from` address and `gas` if it’s not specified in options.
	 *
	 * @param options - The options used for createAccessList.
	 * @param block - If you pass this parameter it will not use the default block set with contract.defaultBlock. Pre-defined block numbers as `earliest`, `latest`, `pending`, `safe` or `finalized can also be used. Useful for requesting data from or replaying transactions in past blocks.
	 * @returns The returned data of the createAccessList,  e.g. The generated access list for transaction.
	 *
	 * ```ts
	 *  const result = await MyContract.methods.myFunction().createAccessList();
	 *  console.log(result);
	 *
	 * > {
	 *  "accessList": [
	 *     {
	 *       "address": "0x15859bdf5aff2080a9968f6a410361e9598df62f",
	 *       "storageKeys": [
	 *         "0x0000000000000000000000000000000000000000000000000000000000000000"
	 *       ]
	 *     }
	 *   ],
	 *   "gasUsed": "0x7671"
	 * }
	 *```
	 */
	createAccessList(tx?: PayableCallOptions, block?: BlockNumberOrTag): Promise<AccessListResult>;
}

export type Web3ContractContext = Partial<
	Web3ContextInitOptions<
		EthExecutionAPI,
		{
			logs: typeof LogsSubscription;
			newHeads: typeof NewHeadsSubscription;
			newBlockHeaders: typeof NewHeadsSubscription;
		}
	>
>;
