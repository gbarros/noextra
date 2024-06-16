
import { getNonodoAvailable } from './nonodo.js';
import { spawn } from 'node:child_process';

export async function addressBook() {
    const nonodoPath = await getNonodoAvailable();
    const child = spawn(nonodoPath, ['address-book'], {
    });
    return new Promise((resolve, reject) => {
        let output = '';
        child.on('exit', (code) => {
            if (code === 0) {
                const lines = output.split('\n').slice(2, -1).map(l => l.split('0x'));
                const addressBook = lines.reduce((acc, [key, value]) => {
                    acc[key.trim()] = `0x${value}`;
                    return acc;
                }, {});
                console.log(addressBook);
                return resolve(addressBook);
            } else {
                reject(new Error('Failed to get address book'));
            }
        });
        child.stdout.on('data', (data) => {
            output += data;
        });
        child.on('error', reject);

    })
}