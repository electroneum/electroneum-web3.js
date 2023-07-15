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
import { keccak256 } from 'ethereum-cryptography/keccak.js';
import { validateNoLeadingZeroes } from 'web3-validator';
import { RLP } from '@ethereumjs/rlp';
import { bytesToHex, hexToBytes, uint8ArrayConcat, uint8ArrayEquals } from 'web3-utils';
import { MAX_INTEGER, SECP256K1_ORDER_DIV_2, secp256k1 } from './constants.js';
import { BaseTransaction } from './baseTransaction.js';
import {
	getAccessListData,
	getAccessListJSON,
	getDataFeeEIP2930,
	verifyAccessList,
} from './utils.js';
import {
	bigIntToHex,
	toUint8Array,
	ecrecover,
	uint8ArrayToBigInt,
	bigIntToUnpaddedUint8Array,
} from '../common/utils.js';
import type {
	AccessList,
	AccessListUint8Array,
	PriorityETNIP1TxData,
	PriorityETNIP1ValuesArray,
	JsonTx,
	TxOptions,
} from './types.js';
import { Capability, ECDSASignature } from './types.js';
import type { Common } from '../common/common.js';

const TRANSACTION_TYPE = 64;
const TRANSACTION_TYPE_UINT8ARRAY = hexToBytes(TRANSACTION_TYPE.toString(16).padStart(2, '0'));

/**
 * Typed transaction with a new gas fee market mechanism
 *
 * - TransactionType: 2
 * - EIP: [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559)
 */
// eslint-disable-next-line no-use-before-define
export class PriorityETNIP1Transaction extends BaseTransaction<PriorityETNIP1Transaction> {
	public readonly chainId: bigint;
	public readonly accessList: AccessListUint8Array;
	public readonly AccessListJSON: AccessList;
	public readonly maxPriorityFeePerGas: bigint;
	public readonly maxFeePerGas: bigint;

	public readonly common: Common;

	public readonly pV?: bigint;
	public readonly pR?: bigint;
	public readonly pS?: bigint;

	/**
	 * The default HF if the tx type is active on that HF
	 * or the first greater HF where the tx is active.
	 *
	 * @hidden
	 */
	protected DEFAULT_HARDFORK = 'london';

	/**
	 * Instantiate a transaction from a data dictionary.
	 *
	 * Format: { chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
	 * accessList, v, r, s }
	 *
	 * Notes:
	 * - `chainId` will be set automatically if not provided
	 * - All parameters are optional and have some basic default values
	 */
	public static fromTxData(txData: PriorityETNIP1TxData, opts: TxOptions = {}) {
		return new PriorityETNIP1Transaction(txData, opts);
	}

	/**
	 * Instantiate a transaction from the serialized tx.
	 *
	 * Format: `0x02 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
	 * accessList, signatureYParity, signatureR, signatureS])`
	 */
	public static fromSerializedTx(serialized: Uint8Array, opts: TxOptions = {}) {
		if (!uint8ArrayEquals(serialized.subarray(0, 1), TRANSACTION_TYPE_UINT8ARRAY)) {
			throw new Error(
				`Invalid serialized tx input: not an ETNIP-1 transaction (wrong tx type, expected: ${TRANSACTION_TYPE}, received: ${bytesToHex(
					serialized.subarray(0, 1),
				)}`,
			);
		}
		const values = RLP.decode(serialized.subarray(1));

		if (!Array.isArray(values)) {
			throw new Error('Invalid serialized tx input: must be array');
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return PriorityETNIP1Transaction.fromValuesArray(values as any, opts);
	}

	/**
	 * Create a transaction from a values array.
	 *
	 * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
	 * accessList, signatureYParity, signatureR, signatureS, prioritySignatureYParity, prioritySignatureR, prioritySignatureS]`
	 */
	public static fromValuesArray(values: PriorityETNIP1ValuesArray, opts: TxOptions = {}) {
		if (values.length !== 9 && values.length !== 15) {
			throw new Error(
				'Invalid ETNIP-1 transaction. Only expecting 9 values (for unsigned tx) or 15 values (for signed tx).',
			);
		}

		const [
			chainId,
			nonce,
			maxPriorityFeePerGas,
			maxFeePerGas,
			gasLimit,
			to,
			value,
			data,
			accessList,
			v,
			r,
			s,
			pV,
			pR,
			pS,
		] = values;

		this._validateNotArray({ chainId, v });
		validateNoLeadingZeroes({
			nonce,
			maxPriorityFeePerGas,
			maxFeePerGas,
			gasLimit,
			value,
			v,
			r,
			s,
			pV,
			pR,
			pS,
		});

		return new PriorityETNIP1Transaction(
			{
				chainId: uint8ArrayToBigInt(chainId),
				nonce,
				maxPriorityFeePerGas,
				maxFeePerGas,
				gasLimit,
				to,
				value,
				data,
				accessList: accessList ?? [],
				v: v !== undefined ? uint8ArrayToBigInt(v) : undefined, // EIP2930 supports v's with value 0 (empty Uint8Array)
				r,
				s,
				pV: pV !== undefined ? uint8ArrayToBigInt(pV) : undefined,
				pR,
				pS,
			},
			opts,
		);
	}

	/**
	 * This constructor takes the values, validates them, assigns them and freezes the object.
	 *
	 * It is not recommended to use this constructor directly. Instead use
	 * the static factory methods to assist in creating a Transaction object from
	 * varying data types.
	 */
	public constructor(txData: PriorityETNIP1TxData, opts: TxOptions = {}) {
		super({ ...txData, type: TRANSACTION_TYPE }, opts);
		const { chainId, accessList, maxFeePerGas, maxPriorityFeePerGas, pV, pR, pS } = txData;

		this.common = this._getCommon(opts.common, chainId);
		this.chainId = this.common.chainId();

		if (!this.common.isActivatedEIP(1559)) {
			throw new Error('EIP-1559 not enabled on Common');
		}
		this.activeCapabilities = this.activeCapabilities.concat([1559, 2718, 2930]);

		// Populate the access list fields
		const accessListData = getAccessListData(accessList ?? []);
		this.accessList = accessListData.accessList;
		this.AccessListJSON = accessListData.AccessListJSON;
		// Verify the access list format.
		verifyAccessList(this.accessList);

		this.maxFeePerGas = uint8ArrayToBigInt(
			toUint8Array(maxFeePerGas === '' ? '0x' : maxFeePerGas),
		);
		this.maxPriorityFeePerGas = uint8ArrayToBigInt(
			toUint8Array(maxPriorityFeePerGas === '' ? '0x' : maxPriorityFeePerGas),
		);

		this._validateCannotExceedMaxInteger({
			maxFeePerGas: this.maxFeePerGas,
			maxPriorityFeePerGas: this.maxPriorityFeePerGas,
			pR: this.pR,
			pS: this.pS,
		});

		const pvB = toUint8Array(pV === '' ? '0x' : pV);
		const prB = toUint8Array(pR === '' ? '0x' : pR);
		const psB = toUint8Array(pS === '' ? '0x' : pS);

		this.pV = pvB.length > 0 ? uint8ArrayToBigInt(pvB) : undefined;
		this.pR = prB.length > 0 ? uint8ArrayToBigInt(prB) : undefined;
		this.pS = psB.length > 0 ? uint8ArrayToBigInt(psB) : undefined;

		BaseTransaction._validateNotArray(txData);

		if (this.gasLimit * this.maxFeePerGas > MAX_INTEGER) {
			const msg = this._errorMsg(
				'gasLimit * maxFeePerGas cannot exceed MAX_INTEGER (2^256-1)',
			);
			throw new Error(msg);
		}

		if (this.maxFeePerGas < this.maxPriorityFeePerGas) {
			const msg = this._errorMsg(
				'maxFeePerGas cannot be less than maxPriorityFeePerGas (The total must be the larger of the two)',
			);
			throw new Error(msg);
		}

		this._validateYParity();
		this._validateHighS();

		const freeze = opts?.freeze ?? true;
		if (freeze) {
			Object.freeze(this);
		}
	}

	/**
	 * The amount of gas paid for the data in this tx
	 */
	public getDataFee(): bigint {
		if (this.cache.dataFee && this.cache.dataFee.hardfork === this.common.hardfork()) {
			return this.cache.dataFee.value;
		}

		let cost = super.getDataFee();
		cost += BigInt(getDataFeeEIP2930(this.accessList, this.common));

		if (Object.isFrozen(this)) {
			this.cache.dataFee = {
				value: cost,
				hardfork: this.common.hardfork(),
			};
		}

		return cost;
	}

	/**
	 * The up front amount that an account must have for this transaction to be valid
	 * @param baseFee The base fee of the block (will be set to 0 if not provided)
	 */
	public getUpfrontCost(baseFee = BigInt(0)): bigint {
		const prio = this.maxPriorityFeePerGas;
		const maxBase = this.maxFeePerGas - baseFee;
		const inclusionFeePerGas = prio < maxBase ? prio : maxBase;
		const gasPrice = inclusionFeePerGas + baseFee;
		return this.gasLimit * gasPrice + this.value;
	}

	/**
	 * Returns a Uint8Array Array of the raw Uint8Arrays of the ETNIP-1 transaction, in order.
	 *
	 * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
	 * accessList, signatureYParity, signatureR, signatureS, prioritySignatureYParity, prioritySignatureR, prioritySignatureS]`
	 *
	 * Use {@link PriorityETNIP1Transaction.serialize} to add a transaction to a block
	 * with {@link Block.fromValuesArray}.
	 *
	 * For an unsigned tx this method uses the empty Uint8Array values for the
	 * signature parameters `v`, `r`, `s`, `pV`, `pR` and `pS` for encoding. For an EIP-155 compliant
	 * representation for external signing use {@link PriorityETNIP1Transaction.getMessageToSign}.
	 */
	public raw(): PriorityETNIP1ValuesArray {
		return [
			bigIntToUnpaddedUint8Array(this.chainId),
			bigIntToUnpaddedUint8Array(this.nonce),
			bigIntToUnpaddedUint8Array(this.maxPriorityFeePerGas),
			bigIntToUnpaddedUint8Array(this.maxFeePerGas),
			bigIntToUnpaddedUint8Array(this.gasLimit),
			this.to !== undefined ? this.to.buf : Uint8Array.from([]),
			bigIntToUnpaddedUint8Array(this.value),
			this.data,
			this.accessList,
			this.v !== undefined ? bigIntToUnpaddedUint8Array(this.v) : Uint8Array.from([]),
			this.r !== undefined ? bigIntToUnpaddedUint8Array(this.r) : Uint8Array.from([]),
			this.s !== undefined ? bigIntToUnpaddedUint8Array(this.s) : Uint8Array.from([]),
			this.pV !== undefined ? bigIntToUnpaddedUint8Array(this.pV) : Uint8Array.from([]),
			this.pR !== undefined ? bigIntToUnpaddedUint8Array(this.pR) : Uint8Array.from([]),
			this.pS !== undefined ? bigIntToUnpaddedUint8Array(this.pS) : Uint8Array.from([]),
		];
	}

	/**
	 * Returns the serialized encoding of the ETNIP-1 transaction.
	 *
	 * Format: `0x40 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
	 * accessList, signatureYParity, signatureR, signatureS, prioritySignatureYParity, prioritySignatureR, prioritySignatureS])`
	 *
	 * Note that in contrast to the legacy tx serialization format this is not
	 * valid RLP any more due to the raw tx type preceding and concatenated to
	 * the RLP encoding of the values.
	 */
	public serialize(): Uint8Array {
		const base = this.raw();
		return uint8ArrayConcat(TRANSACTION_TYPE_UINT8ARRAY, RLP.encode(base));
	}

	/**
	 * Returns the serialized unsigned tx (hashed or raw), which can be used
	 * to sign the transaction (e.g. for sending to a hardware wallet).
	 *
	 * Note: in contrast to the legacy tx the raw message format is already
	 * serialized and doesn't need to be RLP encoded any more.
	 *
	 * ```javascript
	 * const serializedMessage = tx.getMessageToSign(false) // use this for the HW wallet input
	 * ```
	 *
	 * @param hashMessage - Return hashed message if set to true (default: true)
	 */
	public getMessageToSign(hashMessage = true): Uint8Array {
		const base = this.raw().slice(0, 9);
		const message = uint8ArrayConcat(TRANSACTION_TYPE_UINT8ARRAY, RLP.encode(base));
		if (hashMessage) {
			return keccak256(message);
		}
		return message;
	}

	public override isSigned(): boolean {
		const { v, r, s, pV, pR, pS } = this;
		if (
			v === undefined ||
			r === undefined ||
			s === undefined ||
			pV === undefined ||
			pR === undefined ||
			pS === undefined
		) {
			return false;
		}
		return true;
	}

	protected override _validateHighS() {
		const { s, pS } = this;
		if (this.common.gteHardfork('homestead') && s !== undefined && s > SECP256K1_ORDER_DIV_2) {
			const msg = this._errorMsg(
				'Invalid Signature: s-values greater than secp256k1n/2 are considered invalid',
			);
			throw new Error(msg);
		}
		if (
			this.common.gteHardfork('homestead') &&
			pS !== undefined &&
			pS > SECP256K1_ORDER_DIV_2
		) {
			const msg = this._errorMsg(
				'Invalid Priority Signature: s-values greater than secp256k1n/2 are considered invalid',
			);
			throw new Error(msg);
		}
	}

	protected override _validateYParity() {
		const { v, pV } = this;
		if (v !== undefined && v !== BigInt(0) && v !== BigInt(1)) {
			const msg = this._errorMsg('The y-parity of the transaction should either be 0 or 1');
			throw new Error(msg);
		}
		if (pV !== undefined && pV !== BigInt(0) && pV !== BigInt(1)) {
			const msg = this._errorMsg('The y-parity of the transaction should either be 0 or 1');
			throw new Error(msg);
		}
	}

	/**
	 * Computes a sha3-256 hash of the serialized tx.
	 *
	 * This method can only be used for signed txs (it throws otherwise).
	 * Use {@link PriorityETNIP1Transaction.getMessageToSign} to get a tx hash for the purpose of signing.
	 */
	public hash(): Uint8Array {
		if (!this.isSigned()) {
			const msg = this._errorMsg('Cannot call hash method if transaction is not signed');
			throw new Error(msg);
		}

		if (Object.isFrozen(this)) {
			if (!this.cache.hash) {
				this.cache.hash = keccak256(this.serialize());
			}
			return this.cache.hash;
		}

		return keccak256(this.serialize());
	}

	/**
	 * Computes a sha3-256 hash which can be used to verify the signature
	 */
	public getMessageToVerifySignature(): Uint8Array {
		return this.getMessageToSign();
	}

	/**
	 * Returns the public key of the sender
	 */
	public getSenderPublicKey(): Uint8Array {
		if (!this.isSigned()) {
			const msg = this._errorMsg('Cannot call this method if transaction is not signed');
			throw new Error(msg);
		}

		const msgHash = this.getMessageToVerifySignature();
		const { v, r, s } = this;

		this._validateHighS();

		try {
			return ecrecover(
				msgHash,
				v! + BigInt(27), // Recover the 27 which was stripped from ecsign
				bigIntToUnpaddedUint8Array(r!),
				bigIntToUnpaddedUint8Array(s!),
			);
		} catch (e: any) {
			const msg = this._errorMsg('Invalid Signature');
			throw new Error(msg);
		}
	}

	/**
	 * Returns the public key of the sender
	 */
	public getSenderAndPriorityPublicKey(): [Uint8Array, Uint8Array] {
		if (!this.isSigned()) {
			const msg = this._errorMsg('Cannot call this method if transaction is not signed');
			throw new Error(msg);
		}

		const msgHash = this.getMessageToVerifySignature();
		const { v, r, s, pV, pR, pS } = this;

		this._validateHighS();

		try {
			return [
				ecrecover(
					msgHash,
					v! + BigInt(27), // Recover the 27 which was stripped from ecsign
					bigIntToUnpaddedUint8Array(r!),
					bigIntToUnpaddedUint8Array(s!),
				),
				ecrecover(
					msgHash,
					pV! + BigInt(27), // Recover the 27 which was stripped from ecsign
					bigIntToUnpaddedUint8Array(pR!),
					bigIntToUnpaddedUint8Array(pS!),
				),
			];
		} catch (e: any) {
			const msg = this._errorMsg('Invalid Signature');
			throw new Error(msg);
		}
	}

	public _processSignature(v: bigint, r: Uint8Array, s: Uint8Array) {
		const opts = { ...this.txOptions, common: this.common };

		return PriorityETNIP1Transaction.fromTxData(
			{
				chainId: this.chainId,
				nonce: this.nonce,
				maxPriorityFeePerGas: this.maxPriorityFeePerGas,
				maxFeePerGas: this.maxFeePerGas,
				gasLimit: this.gasLimit,
				to: this.to,
				value: this.value,
				data: this.data,
				accessList: this.accessList,
				v: v - BigInt(27), // This looks extremely hacky: /util actually adds 27 to the value, the recovery bit is either 0 or 1.
				r: uint8ArrayToBigInt(r),
				s: uint8ArrayToBigInt(s),
			},
			opts,
		);
	}

	public _processSignatures(
		v: bigint,
		r: Uint8Array,
		s: Uint8Array,
		pV: bigint,
		pR: Uint8Array,
		pS: Uint8Array,
	) {
		const opts = { ...this.txOptions, common: this.common };

		return PriorityETNIP1Transaction.fromTxData(
			{
				chainId: this.chainId,
				nonce: this.nonce,
				maxPriorityFeePerGas: this.maxPriorityFeePerGas,
				maxFeePerGas: this.maxFeePerGas,
				gasLimit: this.gasLimit,
				to: this.to,
				value: this.value,
				data: this.data,
				accessList: this.accessList,
				v: v - BigInt(27), // This looks extremely hacky: /util actually adds 27 to the value, the recovery bit is either 0 or 1.
				r: uint8ArrayToBigInt(r),
				s: uint8ArrayToBigInt(s),
				pV: pV - BigInt(27),
				pR: uint8ArrayToBigInt(pR),
				pS: uint8ArrayToBigInt(pS),
			},
			opts,
		);
	}

	public override sign(privateKey: Uint8Array, priorityPrivateKey?: Uint8Array) {
		if (priorityPrivateKey === undefined) {
			const msg = this._errorMsg('Private key must be 32 bytes in length.');
			throw new Error(msg);
		}
		if (privateKey.length !== 32 || priorityPrivateKey.length !== 32) {
			const msg = this._errorMsg('Private key must be 32 bytes in length.');
			throw new Error(msg);
		}

		// Hack for the constellation that we have got a legacy tx after spuriousDragon with a non-EIP155 conforming signature
		// and want to recreate a signature (where EIP155 should be applied)
		// Leaving this hack lets the legacy.spec.ts -> sign(), verifySignature() test fail
		// 2021-06-23
		let hackApplied = false;
		if (
			this.type === 0 &&
			this.common.gteHardfork('spuriousDragon') &&
			!this.supports(Capability.EIP155ReplayProtection)
		) {
			this.activeCapabilities.push(Capability.EIP155ReplayProtection);
			hackApplied = true;
		}

		const msgHash = this.getMessageToSign(true);
		const { v, r, s } = this.__ecsign(msgHash, privateKey);
		const pSignature = this.__ecsign(msgHash, priorityPrivateKey);
		const tx = this._processSignatures(v, r, s, pSignature.v, pSignature.r, pSignature.s);

		// Hack part 2
		if (hackApplied) {
			const index = this.activeCapabilities.indexOf(Capability.EIP155ReplayProtection);
			if (index > -1) {
				this.activeCapabilities.splice(index, 1);
			}
		}

		return tx;
	}

	// eslint-disable-next-line class-methods-use-this
	private __ecsign(
		msgHash: Uint8Array,
		privateKey: Uint8Array,
		chainId?: bigint,
	): ECDSASignature {
		const signature = secp256k1.sign(msgHash, privateKey);
		const signatureBytes = signature.toCompactRawBytes();

		const r = signatureBytes.subarray(0, 32);
		const s = signatureBytes.subarray(32, 64);

		const v =
			chainId === undefined
				? BigInt(signature.recovery! + 27)
				: BigInt(signature.recovery! + 35) + BigInt(chainId) * BigInt(2);

		return { v, r, s };
	}

	/**
	 * Returns an object with the JSON representation of the transaction
	 */
	public toJSON(): JsonTx {
		const accessListJSON = getAccessListJSON(this.accessList);

		return {
			chainId: bigIntToHex(this.chainId),
			nonce: bigIntToHex(this.nonce),
			maxPriorityFeePerGas: bigIntToHex(this.maxPriorityFeePerGas),
			maxFeePerGas: bigIntToHex(this.maxFeePerGas),
			gasLimit: bigIntToHex(this.gasLimit),
			to: this.to !== undefined ? this.to.toString() : undefined,
			value: bigIntToHex(this.value),
			data: bytesToHex(this.data),
			accessList: accessListJSON,
			v: this.v !== undefined ? bigIntToHex(this.v) : undefined,
			r: this.r !== undefined ? bigIntToHex(this.r) : undefined,
			s: this.s !== undefined ? bigIntToHex(this.s) : undefined,
			pV: this.pV !== undefined ? bigIntToHex(this.pV) : undefined,
			pR: this.pR !== undefined ? bigIntToHex(this.pR) : undefined,
			pS: this.pS !== undefined ? bigIntToHex(this.pS) : undefined,
		};
	}

	/**
	 * Return a compact error string representation of the object
	 */
	public errorStr() {
		let errorStr = this._getSharedErrorPostfix();
		errorStr += ` maxFeePerGas=${this.maxFeePerGas} maxPriorityFeePerGas=${this.maxPriorityFeePerGas}`;
		return errorStr;
	}

	/**
	 * Internal helper function to create an annotated error message
	 *
	 * @param msg Base error message
	 * @hidden
	 */
	protected _errorMsg(msg: string) {
		return `${msg} (${this.errorStr()})`;
	}
}
