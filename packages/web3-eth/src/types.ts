﻿/*
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

import { AccessList, TransactionHash, Uncles, FormatType, ETH_DATA_FORMAT } from 'web3-common';
import { Address, Bytes, Numbers, Uint } from 'web3-utils';

export type ValidChains = 'goerli' | 'kovan' | 'mainnet' | 'rinkeby' | 'ropsten' | 'sepolia';
export type Hardfork =
	| 'arrowGlacier'
	| 'berlin'
	| 'byzantium'
	| 'chainstart'
	| 'constantinople'
	| 'dao'
	| 'homestead'
	| 'istanbul'
	| 'london'
	| 'merge'
	| 'muirGlacier'
	| 'petersburg'
	| 'shanghai'
	| 'spuriousDragon'
	| 'tangerineWhistle';

export interface Log {
	readonly removed?: boolean;
	readonly logIndex?: Numbers;
	readonly transactionIndex?: Numbers;
	readonly transactionHash?: Bytes;
	readonly blockHash?: Bytes;
	readonly blockNumber?: Numbers;
	readonly address?: Address;
	readonly data?: Bytes;
	readonly topics?: Bytes[];
}

export interface ReceiptInfo {
	readonly transactionHash: Bytes;
	readonly transactionIndex: Numbers;
	readonly blockHash: Bytes;
	readonly blockNumber: Numbers;
	readonly from: Address;
	readonly to: Address;
	readonly cumulativeGasUsed: Numbers;
	readonly gasUsed: Numbers;
	readonly effectiveGasPrice?: Numbers;
	readonly contractAddress?: Address;
	readonly logs: Log[];
	readonly logsBloom: Bytes;
	readonly root: Bytes;
	readonly status: Numbers;
	readonly type?: Numbers;
}

export interface CustomChain {
	name?: string;
	networkId: Numbers;
	chainId: Numbers;
}

export interface Common {
	customChain: CustomChain;
	baseChain?: ValidChains;
	hardfork?: Hardfork;
}

interface TransactionBase {
	value?: Numbers;
	accessList?: AccessList;
	common?: Common;
	// eslint-disable-next-line @typescript-eslint/ban-types
	to?: Address | null;
	gas?: Numbers;
	gasPrice?: Numbers;
	type?: Numbers;
	maxFeePerGas?: Numbers;
	maxPriorityFeePerGas?: Numbers;
	data?: Bytes;
	input?: Bytes;
	nonce?: Numbers;
	chain?: ValidChains;
	hardfork?: Hardfork;
	chainId?: Numbers;
	networkId?: Numbers;
	gasLimit?: Numbers;
	yParity?: Uint;
	v?: Numbers;
	r?: Bytes;
	s?: Bytes;
}

export interface Transaction extends TransactionBase {
	from?: Address;
}

export interface TransactionWithLocalWalletIndex extends TransactionBase {
	from?: Numbers;
}

export interface TransactionInfo extends Transaction {
	readonly blockHash?: Bytes;
	readonly blockNumber?: Numbers;
	readonly from: Address;
	readonly hash: Bytes;
	readonly transactionIndex?: Numbers;
}

export type InternalTransaction = FormatType<Transaction, typeof ETH_DATA_FORMAT>;

export interface TransactionCall extends Transaction {
	to: Address;
}

export interface PopulatedUnsignedBaseTransaction {
	from: Address;
	to?: Address;
	value: Numbers;
	gas?: Numbers;
	gasPrice: Numbers;
	type: Numbers;
	data: Bytes;
	nonce: Numbers;
	networkId: Numbers;
	chain: ValidChains;
	hardfork: Hardfork;
	chainId: Numbers;
	common: Common;
	gasLimit: Numbers;
}

export interface PopulatedUnsignedEip2930Transaction extends PopulatedUnsignedBaseTransaction {
	accessList: AccessList;
}

export interface PopulatedUnsignedEip1559Transaction extends PopulatedUnsignedEip2930Transaction {
	gasPrice: never;
	maxFeePerGas: Numbers;
	maxPriorityFeePerGas: Numbers;
}
export type PopulatedUnsignedTransaction =
	| PopulatedUnsignedBaseTransaction
	| PopulatedUnsignedEip2930Transaction
	| PopulatedUnsignedEip1559Transaction;

export interface Block {
	readonly parentHash: Bytes;
	readonly sha3Uncles: Bytes;
	readonly miner: Bytes;
	readonly stateRoot: Bytes;
	readonly transactionsRoot: Bytes;
	readonly receiptsRoot: Bytes;
	readonly logsBloom?: Bytes;
	readonly difficulty?: Numbers;
	readonly number: Numbers;
	readonly gasLimit: Numbers;
	readonly gasUsed: Numbers;
	readonly timestamp: Numbers;
	readonly extraData: Bytes;
	readonly mixHash: Bytes;
	readonly nonce: Numbers;
	readonly totalDifficulty: Numbers;
	readonly baseFeePerGas?: Numbers;
	readonly size: Numbers;
	readonly transactions: TransactionHash[] | TransactionInfo[];
	readonly uncles: Uncles;
	readonly hash?: Bytes;
}

export type SendTransactionEvents = {
	sending: Transaction;
	sent: Transaction;
	transactionHash: Bytes;
	receipt: ReceiptInfo;
	confirmation: {
		confirmationNumber: Numbers;
		receipt: ReceiptInfo;
		latestBlockHash: Bytes;
	};
};

export interface SendTransactionOptions<ResolveType = ReceiptInfo> {
	ignoreGasPricing?: boolean;
	transactionResolver?: (receipt: ReceiptInfo) => ResolveType;
}

export interface SendSignedTransactionOptions<ResolveType = ReceiptInfo> {
	transactionResolver?: (receipt: ReceiptInfo) => ResolveType;
}

export type SendSignedTransactionEvents = SendTransactionEvents & {
	sending: Bytes;
	sent: Bytes;
	transactionHash: Bytes;
	receipt: ReceiptInfo;
	confirmation: {
		confirmationNumber: Numbers;
		receipt: ReceiptInfo;
		latestBlockHash: Bytes;
	};
};

export interface FeeHistory {
	readonly oldestBlock: Numbers;
	readonly baseFeePerGas: Numbers;
	readonly reward: Numbers[][];
}

export interface StorageProof {
	readonly key: Bytes;
	readonly value: Numbers;
	readonly proof: Bytes[];
}

export interface AccountObject {
	readonly balance: Numbers;
	readonly codeHash: Bytes;
	readonly nonce: Numbers;
	readonly storageHash: Bytes;
	readonly accountProof: Bytes[];
	readonly storageProof: StorageProof[];
}