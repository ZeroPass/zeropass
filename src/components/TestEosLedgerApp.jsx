import React, { Component } from 'react';
//import Transport from '@ledgerhq/hw-transport-node-hid'
import Transport from '@ledgerhq/hw-transport-u2f'
import EosLedger from '../../../eosledgerjs/lib/EosLedger.js';
import Eos from 'eosjs'
import { sha256 as Sha256 } from 'sha.js' // used with hash signing method instead

import eosutils from "./eosutils.js"

const hasher = new Sha256()

const DecimalPad = Eos.modules.format.DecimalPad
const ecc = Eos.modules.ecc
const bip32PathPrefix = "44'/194'/0'/0/"

const eosCryptoKylinConfig = {
    expireInSeconds: 3000,
    httpEndpoint: 'https://api.kylin.alohaeos.com:443',
    chainId: "5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191",
    verbose: false,
    broadcast: false,
    sign: false
}

const eosJungleConfig = {
    expireInSeconds: 3000,
    httpEndpoint: 'https://api.jungle.alohaeos.com:443',
    verbose: false,
    broadcast: false,
    sign: false
}



export class TestEosLedgerApp extends Component {
    constructor() {
        super();
        this.state = {
            app_ver: "Loading ...",
            sign_hash_enabled:false,
            eos_addr:"Loading ...",
            eos_accounts: ["None"],
            selected_account_idx: -1
        };


        this.eosLedger = null;

        this.updateTimer = null;
        this.eosConfig = eosCryptoKylinConfig;
        this.eos = null;

        this.btnSignHashDisabled = true;
        this.signHashSignature = ""
    }

    async componentDidMount() {
        const t = await Transport.create();
        this.eosLedger = new EosLedger(t);
        this.eosLedger.setAllowNoneHardenedKeys(true);

        this.eos = new Eos(this.eosConfig)
        this.updateEosAddress();
        this.startUpdateTimer()
    }

    getKeyPath() {
        return bip32PathPrefix + inAddrChildIdx.value
    }

    async getAddress(path) {
       // const eosLedger = new EosLedger(this.transport)
        const result = await this.eosLedger.getPublicKey(path, false, false)
        return 'EOS' + result.publicKey.toString()
    }

    startUpdateTimer() {
        if(this.updateTimer == null) {
            this.updateTimer = setInterval(() => {this.updateLedgerState()}, 1000);
        }
    }

    stopUpdateTimer() {
        if(this.updateTimer != null) {
            clearInterval(this.updateTimer)
            this.updateTimer = null;
        }
    }

    async updateEosAccountsList() {

        try {
            const accounts = await this.eos.getKeyAccounts(this.state.eos_addr);
            this.setState({eos_accounts: accounts.account_names})
        }
        catch(err){
            console.log("Error retrieving accounts:", err)
            this.resetMsgBox()
            this.showMsgBox("Failed to retrieve accounts",
                "An error has occurred while trying to get\naccount names for EOS address:\n\n" + this.state.eos_addr
            )
        }
        finally{
            if(this.state.eos_accounts.length == 0) {
                this.setState({eos_accounts: ["None"], selected_account_idx: -1})
            } else {
                this.setState({selected_account_idx: 0})
            }
        }
    }

    async updateEosAddress() {
        try {
            this.stopUpdateTimer()
            inAddrChildIdx.disabled=true;
            this.signHashSignature = "";

            const addr = await this.getAddress(this.getKeyPath())
            this.setState({
                eos_addr:addr,
            })

            this.updateEosAccountsList()

        } catch(err){
            console.log(err.message);
            this.setState({ eos_addr:"N/A", eos_accounts: ["None"]});
            this.showMsgNoLeger()
        }
        finally {
            inAddrChildIdx.disabled=false;
            this.startUpdateTimer()
        }
    }

    async updateLedgerState() {
        try {
            const appConfig = await this.eosLedger.getAppConfiguration()


            if(!appConfig.multiOpsEnabled && this.state.sign_hash_enabled) {
                inHashToSign.value = "";
                this.signHashSignature = "";
            }

            this.setState({
                app_ver:appConfig.version,
                sign_hash_enabled:appConfig.multiOpsEnabled,
            })

            if(this.state.eos_addr == "N/A") {
                this.updateEosAddress()
            } else {
                this.hideMsgNoLeger();
            }
        }
        catch(err) {
            console.log(err.message);
            this.setState({ app_ver: "N/A", eos_addr:"N/A", eos_accounts: ["None"] , sign_hash_enabled:false });
            this.showMsgNoLeger()
        }
    }

    showMsgBox(title, text, btn_text="OK", action = ()=> { this.hideMsgBox(); }) {
        msgbox.style.display = "block";
        msgbox_title.innerText = title;
        msgbox_text.innerText = text;
        msgbox_button.innerText = btn_text;
        msgbox_button.onclick = action;
    }

    hideMsgBox() {
        msgbox.style.display = "none";
    }

    hideMsgNoLeger() {
        if(msgbox_title.innerText == "No Ledger Found") {
            this.hideMsgBox()
        }
    }

    showMsgNoLeger() {
        this.resetMsgBox();
        this.showMsgBox("No Ledger Found",
            "Connect Ledger hardware wallet and\nopen EOS Ledger app.",
            "Retry"
        );
    }

    resetMsgBox() {
        this.hideMsgBox()
        msgbox_dialog.style="background-color:darkred"
        msgbox_button.style.display="block"
    }

    showMsgCheckDevice() {
        this.showMsgBox("Check device",
            "Check your ledger device to confirm action ..."
        );
        msgbox_dialog.style="background-color:blue"
        msgbox_button.style.display="none"
    }

    hideMsgCheckDevice() {
        if(msgbox_title.innerText == "Check device") {
            this.hideMsgBox()
        }
    }

    showMsgDeviceError(text) {
        if(msgbox_title.innerText != "No Ledger Found") {
            this.resetMsgBox()
            this.showMsgBox("Device Error", text);
        }
    }

    showMsgTxSuccess(txid) {
        this.resetMsgBox()
        msgbox_dialog.style="background-color:green"
        this.showMsgBox("Transaction Success", "Transaction was successfully pushed to the EOS blockchain!\n\nTxID: " + txid);
    }


    // Ledger operations
    async signHash() {
        try {
            this.stopUpdateTimer()
            this.showMsgCheckDevice();

            const hash = new Buffer(inHashToSign.value, "hex")
            const sig = await this.eosLedger.signHash(this.getKeyPath(), hash)

            this.signHashSignature = sig.signature.toString('hex');
            this.hideMsgCheckDevice();
            this.forceUpdate();
        }
        catch(err){

            if((err instanceof Error) && err.toString().includes("rejected")){
                this.hideMsgCheckDevice();
            }
            else {
                console.log("Sign hash error:", err)
                this.showMsgDeviceError("Ledger device failed to sign hash!");
            }
        }
        finally{
            this.startUpdateTimer()
        }
    }

    async makeTransaction(actions) {
        actions = actions.filter(function (el) {
            return el != null && el !== "";
        });
        const info = await this.eos.getInfo({})
        const block = await this.eos.getBlock(info.last_irreversible_block_num)
        return eosutils.makeTransaction(info, block, this.eosConfig.expireInSeconds, actions)
    }

    getSelectedAccount() {
        const aidx = this.state.selected_account_idx
        if(aidx < 0 || this.state.eos_accounts.length <= aidx) {
            return ""
        }
        return this.state.eos_accounts[aidx]
    }

    async makeAction(contractName, actionName, permission, actionData) {
        if(contractName === "" || actionName === "" || permission === "") {
            return ""
        }

        if(!contractName.includes("eosio")) { //cache contract's ABI
            await this.eos.contract(contractName)
        }

        const aperm = eosutils.makePermission(this.getSelectedAccount(), permission);
        return eosutils.makeAction(contractName, actionName, [aperm], actionData)
    }

    async signAndSendTransaction() {
        try {
            this.stopUpdateTimer()
            this.showMsgCheckDevice();

            var action1 = await this.makeAction(inContract.value, inAction.value, inActionPermission.value, inActionData.value);
            var action2 = await this.makeAction(inContract2.value, inAction2.value, inActionPermission2.value, inActionData2.value);

            if(action1 === "" && action1 === "") {
                this.resetMsgBox()
                this.showMsgBox("Invalid action data",
                    "Invalid action data specified. Make sure that fields:\n'Contract name', 'Action name' and 'Permission' are specified"
                )
                return
            }


            const tx = await this.makeTransaction([action1, action2]);

            try {
                // Sign tx with ledger
                const unsignedBuffer = eosutils.serializeTransaction(this.eos, this.eosConfig.chainId, tx)
                const signatureBuffer = await this.eosLedger.signTransaction(this.getKeyPath(), unsignedBuffer)

                let formattedSignature = ecc.Signature.from(signatureBuffer.signature).toString()
                tx.signatures.push(formattedSignature)

            }
            catch (err) {
                if((err instanceof Error) && err.toString().includes("rejected")){
                    this.hideMsgCheckDevice();
                }
                else {
                    console.log("Sign transaction error:", err)
                    this.showMsgDeviceError("Ledger device failed to sign transaction!");
                }
                return;
            }

            // Send tx
            let r = await this.eos.pushTransaction(tx)
            console.log(r)
            this.showMsgTxSuccess(r.transaction_id)
            this.forceUpdate();
        }
        catch(err){
            console.log("eosjs error:", err)
            this.resetMsgBox()
            this.showMsgBox("Transaction error",
                "An error has occurred while trying to create\nand send transaction:\n\n" + err.toString()
            )
        }
        finally{
            this.startUpdateTimer()
        }
    }


    render() {
        const accountItems = this.state.eos_accounts.map((account, index) =>
            <option key={index} value={index}>{account}</option>
        );

        const setVisible = function(e) {
            display: this.state.sign_hash_enabled ? "block" : "none"
        }

        return (
            <div className="flex">
                {/* Msg box component */}
                <div id="msgbox" className="msgbox-overlay">
                    <div className="msgbox" id="msgbox_dialog">
                        <h2 id="msgbox_title"></h2>
                        <div className="box-body">
                            <p id="msgbox_text"></p>
                            <button id="msgbox_button" type="submit"></button>
                        </div>
                    </div>
                </div>
                 {/* Info component */}
                <div className="box">
                    <h2>Ledger EOS App - Info</h2>
                    <div className="box-body" style={{minWidth: 600}}>
                        <p><strong>App Version:</strong> {this.state.app_ver}</p>
                        <p><strong>Signing hash enabled: </strong>{this.state.sign_hash_enabled.toString().toUpperCase()}</p>
                        <p><label><strong>BIP32 path:</strong> {bip32PathPrefix} </label><input style={{minWidth: 3}} id="inAddrChildIdx" type="number" onChange={() => this.updateEosAddress() } defaultValue="0" min="0" max="255" placeholder="Idx"/></p>
                        <p><strong>EOS Address: </strong>{this.state.eos_addr}</p>


                        <div className="form-control">
                            <label><strong>Test net: </strong></label>
                            <select id="optEosConfig" style={{minWidth: "8.5em"}}>
                                <option>Crypto Kylin</option>
                            </select>
                        </div>

                        <div className="form-control">
                            <label><strong>Selected account: </strong></label>
                            <select id="optEosAccount" value={this.state.selected_account_idx} style={{minWidth: "9em"}}
                            onChange={(e)=>{
                                this.setState({selected_account_idx:e.target.value});
                            }}
                            >
                                {accountItems}
                            </select>
                        </div>
                    </div>
                </div>

                 {/* Sign hash component */}
                <div className="box" style={{display: this.state.sign_hash_enabled ? "block" : "none"}} >
                    <h2>Sign Hash</h2>
                    <div className="box-body">
                        <table>
                            <tbody>
                            <tr>
                                <th>
                                    <input id="inHashToSign" onKeyPress={(e) => {
                                        const re = /[0-9a-fA-F]+/g;
                                        if (!re.test(e.key) || inHashToSign.value.length >= 64) {
                                            e.preventDefault();
                                        }
                                    }} onChange={()=>{
                                        if(inHashToSign.value.length == 64) {
                                            this.btnSignHashDisabled=false
                                        } else {
                                            this.btnSignHashDisabled=true
                                        }
                                        this.signHashSignature = ""
                                        this.forceUpdate()
                                    }}
                                    placeholder="Hash value to sign (SHA-256)" style={{minWidth: 750}}/>
                                </th>
                                <th>
                                    <button id="btnSignHash" disabled={this.btnSignHashDisabled} onClick={()=> this.signHash() }>Sign</button>
                                </th>
                            </tr>
                            </tbody>
                        </table>
                        <p></p>
                        <p></p>
                        <table style={{display: this.signHashSignature === "" ? "none" : "block"}}>
                            <tbody>
                                <tr>
                                    <td valign="top">
                                        <label><strong>Signature: </strong></label>
                                    </td>
                                    <td>
                                        <div id="labSignature" style={{hight: 200, width: 680, overflowWrap:'break-word'}}>{ this.signHashSignature }</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Transaction component */}
                <div className="box" style={{display: this.state.selected_account_idx >= 0 ? "block" : "none"}} >
                    <h2>Push Transaction</h2>
                    <div className="box-body" style={{minWidth: 600}}>

                        {/* Action 1 component */}
                        <h3>Action 1</h3>
                        <div className="action-box-body">
                            <p><label>Contract name: </label><input id="inContract" style={{minWidth: 15, width: 165}} onKeyPress={(e)=>{
                                if(e.target.value.length >= 12){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}/>
                            </p>
                            <p><label>Action name: </label><input id="inAction" style={{minWidth: 15, width: 165}} onKeyPress={(e)=>{
                                if(e.target.value.length >= 12){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}/>
                            </p>
                            <p><label>Action data: </label><input id="inActionData" style={{minWidth: 1000 }} />
                            </p>
                            <p><label>Permission: </label><input id="inActionPermission" defaultValue="active" style={{minWidth: 15, width: 165}} onKeyPress={(e)=>{
                                if(e.target.value.length >= 12){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}/>
                            </p>
                        </div>

                        {/* Action 2 component */}
                        <h3>Action 2</h3>
                        <div className="action-box-body">
                            <p><label>Contract name: </label><input id="inContract2" style={{minWidth: 15, width: 165}} onKeyPress={(e)=>{
                                if(e.target.value.length >= 12){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}/>
                            </p>
                            <p><label>Action name: </label><input id="inAction2" style={{minWidth: 15, width: 165}} onKeyPress={(e)=>{
                                if(e.target.value.length >= 12){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}/>
                            </p>
                            <p><label>Action data: </label><input id="inActionData2" style={{minWidth: 1000 }} />
                            </p>
                            <p><label>Permission: </label><input id="inActionPermission2" defaultValue="active" style={{minWidth: 15, width: 165}} onKeyPress={(e)=>{
                                if(e.target.value.length >= 12){
                                    e.preventDefault();
                                    e.stopPropagation();
                                }
                            }}/>
                            </p>
                        </div>

                        <p style={{minHeight:20}}></p>
                        <button style={{minHeight:80, minWidth:300, display:"block", marginLeft:"auto", marginRight:"auto"}} onClick={() => { this.signAndSendTransaction() }}>Sign and send</button>
                    </div>
                </div>
            </div>
        );
    }
}
export default TestEosLedgerApp;