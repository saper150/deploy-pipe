const ssh = new (require('node-ssh'))()
const path = require('path')

const util = require('util');
const exec = util.promisify(require('child_process').exec);

module.exports = async (conObj, { remoteWorkingDir }, pipe) => {

    const connection = await ssh.connect(conObj)

    for (const step of pipe) {
        let promise
        if (step.type === 'remoteExec') {
            promise = ssh.exec(`
                cd ${remoteWorkingDir}
                ${step.exec}
            `)
        } else if (step.type === "localExec") {
            promise = exec(step.exec)
        } else if (step.type === 'uploadDirectory') {
            const exclude = step.exclude || []
            console.log(step)
            promise = ssh.putDirectory(step.localDir, path.join(remoteWorkingDir, step.remoteDir).replace('\\', '/'), {
                recursive: true,
                concurrency: 1,
                validate: itemPath => !exclude.includes(path.basename(itemPath)),
                tick: function (localPath, remotePath, error) {
                    if (error) {
                        console.log(error)
                        console.log('error', localPath)
                    } else {
                        console.log('uploaded', localPath)
                    }
                }
            })
        } else {
            throw new Error('unknown step type')
        }

        if (step.ignoreErrors) {
            promise = promise.catch((err) => err)
        }

        if (!step.silent) {
            promise = promise.then(console.log)
        }
        await promise
    }

}
