import { runNonodo, getNonodoAvailable } from './nonodo.js';
import { Tikua } from '@doiim/tikua';
import { createWalletClient, http } from 'viem';
import { anvil } from 'viem/chains';

export { getCartesiDeploymentAddress, getCartesiContractAbi, decodeEtherDeposit, decodeERC20Deposit, decodeERC721Deposit, decodeERC1155BatchDeposit, decodeERC1155SingleDeposit } from '@doiim/tikua';
export { addressBook } from './address.js';
class Nonodo {
    constructor() {
        this.node = null;
    }

    async start() {
        const nonodoPath = await getNonodoAvailable();
        this.node = await runNonodo(nonodoPath, [], {
            env: {
                ...process.env, // copy the parent process's environment variables
            },
        });
    }

    async stop() {
        if (this.node) {
            this.node.kill('SIGINT');
        } else {
            throw new Error('Node is not running');
        }
    }

}
export function getTikua(abi) {
    const walletClient = createWalletClient({
        chain: anvil,
        account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        transport: http()
    });
    return new Tikua({
        appAddress: "0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e",
        abi: abi,
        appEndpoint: "http://localhost:8080",
        provider: walletClient,
    });

}

export const nonodo = new Nonodo();