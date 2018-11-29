
export default {

    makePermission(actor, permission) {
        return{
            actor: actor,
            permission:permission
        }
    },

    makeAction(contractName, actionName, auths, actionData){
        if(typeof(actionData) ==  "string") {
            actionData = JSON.parse(actionData)
        }
        return {
            account: contractName,
            name: actionName,
            authorization: auths,
            data: actionData
        }
    },

    makeTransaction(info, block, expireInSeconds, actions) {

        var tx = {
            compression: "none",
            signatures: [],
            transaction:
            {
                actions: actions,
                context_free_actions: [],
                delay_sec: 0,
                max_cpu_usage_ms: 0,
                max_net_usage_words: 0,
                transaction_extensions: []
            }
        };

        const chainDate = new Date(info.head_block_time + 'Z')
        var expiration = new Date(chainDate.getTime() + expireInSeconds * 1000)
        expiration = expiration.toISOString().split('.')[0]

        tx.transaction.expiration = expiration;
        tx.transaction.ref_block_num = info.last_irreversible_block_num & 0xFFFF;
        tx.transaction.ref_block_prefix = block.ref_block_prefix;

        return tx
    },

    serializeTransaction(eos, chainId, tx) {
        let chainBuffer = Buffer.from(chainId, 'hex')
        let contextFreeData = Buffer.from(new Uint8Array(32))
        let fcBuffer = eos.fc.toBuffer('transaction', tx.transaction)
        let serTx = Buffer.concat([chainBuffer, fcBuffer, contextFreeData])
        return serTx
    }
}