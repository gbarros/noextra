/**
 * You can try this example by running `node examples/meme.js`
 * and running the developement server of meme-backend at https://github.com/Mugen-Builders/memebet-backend
 * 
 * idealy this script will reside inside your project, so you don't need to do such manual actions.
 */

import { getTikua, nonodo } from "../src/index.js";
import { toHex } from "viem/utils";

function sleep(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

nonodo.start();
(async () => {
    console.log("Starting nonodo, waitng 5 seconds");
    await sleep(5000); // wait for you to start the server
    const abi = [
        "function createGame(bytes32 home, bytes32 away, address token , uint256 start, uint256 end, bytes32 validatorFunctionName)",
        "function closeGame(bytes32 gameid)",
        "function placeBet(bytes32 gameid, bytes32 pick, address token, uint256 amount)",
        "function addValidationFunction(bytes32 name, bytes functionString)",
        "function depositEther(uint256 amount)",
        "function depositERC20(uint256 amount)",
        "function depositERC721(uint256 id, address tokenAddress)",
        "function depositERC1155Single(uint256 id, address tokenAddress)",
        "function depositERC1155Batch(uint256[] ids, address tokenAddress)",
    ]
    const tikua = getTikua(abi);
    const e18 = BigInt(1e18);
    await tikua.depositEther(10n * e18, "").then(console.log)
    await sleep(200);
    const n = await tikua.fetchNoticeFromInput(0, 0);
    console.log(n[0], n[0].payload.args);

    const valFunction = `
    function bet(...args) {
        console.log("Validating bet", args);
        const it = args[0].keys();
        return it.next().value;
    };
    (()=>{ return bet})(); 
    `;
    const functionName = toHex("mockValidation", { size: 32 });
    const tx = await tikua.sendInput("addValidationFunction", [functionName, toHex(valFunction)]);
    console.log(tx);
    await sleep(200);
    const ether = "0x0000000000000000000000000000000000000000";
    const start = BigInt(Math.floor(Date.now() / 1000));
    const end = start + BigInt(60 * 60 * 24);
    const tx2 = await tikua.sendInput("createGame", [
        toHex("home", { size: 32 }),
        toHex("away", { size: 32 }),
        ether,
        start,
        end,
        functionName]);
    await sleep(20 * 1000);
})().finally(() => {
    nonodo.stop();
});