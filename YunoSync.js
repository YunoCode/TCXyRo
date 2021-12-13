const Http = require('http')
const fs = require('fs')
const path = require('path')
const Port = 3000

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const express = require('express')
const bodyParser = require('body-parser')
const { dir } = require('console')
const { raw } = require('express')

const app = express()
const app2 = express()

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

app2.use(express.json({limit: '50mb'}));
app2.use(express.urlencoded({limit: '50mb'}));

app2.listen(3000, function (error) {
    if (error) {
        console.log(error)
    } else {
        console.log('server listening on port ' + Port)
    }
})

Object.size = function (obj) {
    var size = 0,
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function findAddress(curdir, filename) {
    if (fs.existsSync(`${curdir}/${filename}`)) return ''
    if (fs.existsSync(`${curdir}/${filename}.lua`)) return '.lua'
    if (fs.existsSync(`${curdir}/${filename}.client.lua`)) return 'client.lua'
    if (fs.existsSync(`${curdir}/${filename}.server.lua`)) return 'server.lua'

    return null
}

function addressExist(curdir, filename) {
    if (fs.existsSync(`${curdir}/${filename}`)) {
        const split = filename.split(".")
        if (split[1] == 'lua' || split[2] == 'lua' ) {
            if (split[1] == 'lua') return '.lua'
            return split[1]+'.'+split[2]
        } else return ''
    } else return null
}

function replaceGame(contents) {
    for (const [key, value] of Object.entries(contents)) {

        function read(curdir, value) {
            if (value.Type == 'ModuleScript' || value.Type == 'LocalScript' || value.Type == 'Script') {
                // scripts and stuff
                var type = value.Type == 'ModuleScript' ? '' : value.Type == 'LocalScript' ? '.client' : value.Type == 'Script' ? '.server' : ''
                if (!value.Children && findAddress(curdir, value.Name) === null) {
                    // not parented script
                    console.log(`${curdir}/${value.Name}`)
                    fs.appendFile(`${curdir}/${value.Name}${type}.lua`, value.Source, () => console.log)
                } else {
                    if (
                        !fs.existsSync(`${curdir}/${value.Name}.lua`) &&
                        !fs.existsSync(`${curdir}/${value.Name}.client.lua`) &&
                        !fs.existsSync(`${curdir}/${value.Name}.server.lua`)
                    ) {
                        fs.mkdir(`${curdir}/${value.Name}`, () => console.log)
                    } else {
                        fs.unlink(`${curdir}/${value.Name}${findAddress(curdir, value.Name)}`, () => console.log)

                        //fs.unlink(`${curdir}/${value.Name}`)
                        fs.mkdir(`${curdir}/${value.Name}`, () => console.log)
                    }

                    fs.appendFile(`${curdir}/${value.Name}/${value.Name}${type}.lua`, value.Source, () => console.log)
                }
            } else {
                if (!fs.existsSync(`${curdir}/${value.Name}`)) {
                    fs.mkdir(`${curdir}/${value.Name}`, () => console.log)
                }
            }

            if (value.Children) read(curdir + '/' + value.Name, value.Children)
        }

        read('./game', value)
    }
}

function getFile(from, path) {
    let p = from || ''
    let l = 1
    for (const [key, value] of Object.entries(path)) {
        const prevp = p
        p = p+"/"+value
        const address = addressExist(prevp, value)

        if (address != '') {
            // .lua | .client.lua | .server.lua
           // if (!fs.existsSync(p)) {
                // dosent exist
                if (l != Object.size(path)) {
                    // parented module
                    
                    // search for folder
                    const rawName = value.split('.')[0]
                    if (fs.existsSync(prevp+'/'+rawName)) {
                        // make sure folder exist
                        p = prevp + '/' + rawName
                    } else if (!fs.existsSync(prevp+'/'+rawName) && fs.existsSync(prevp+'/'+value)) {
                        console.log("no folder, has file")
                        // no folder, has file
                        fs.mkdirSync(prevp+'/'+rawName)
                        fs.appendFileSync(prevp+'/'+rawName+'/'+value, fs.readFileSync(prevp+'/'+value))
                        fs.unlinkSync(prevp+'/'+value)
                        p = prevp + '/' + rawName
                    }
                } else {
                    // make new file
                    const rawName = value.split('.')[0]
                    if (fs.existsSync(prevp+'/'+rawName) && fs.existsSync(prevp+'/'+rawName+'/'+value)) {
                        // has folder and has file
                        return {main: prevp+'/'+rawName+'/'+value, folder: prevp+'/'+rawName}
                        // fs.writeFile(prevp+'/'+rawName+'/'+value, source, () => console.log)
                     }
                    return {main: p}
                    // fs.writeFile(p, source, () => console.log)
                }
           // }
        }
        l += 1
    }

    return {main: p}
}

app.post('/', function (req, res) {
    if (req.body.t == 'changed') {
        const file = getFile("./game", (req.body.c.p).reverse())
        if (!fs.existsSync(file)) {
            fs.appendFileSync(file.main, req.body.c.s)
        } else {
            fs.writeFileSync(file.main, req.body.c.s)
        }
        res.end()
    } else if (req.body.t == 'added') {
        const file = getFile("./game", (req.body.c.p).reverse())
        
        if (file.folder && !fs.existsSync(file.folder)) {
            fs.mkdirSync(file.folder)
            fs.appendFileSync(file.main, req.body.c.s)
        } else {
            if (!fs.existsSync(file.main)) {
                fs.appendFileSync(file.main, req.body.c.s)
            } else {
                fs.writeFileSync(file.main, req.body.c.s)
            }
        }
        res.end()
    } else if (req.body.t == 'removed') {
        const file = getFile("./game", (req.body.c.p).reverse())
        if (fs.existsSync(file.folder) || fs.existsSync(file.main)) {
            fs.unlinkSync(file.folder || file.main)
        }
    } else {
        const contents = req.body

        replaceGame(contents)

        res.send("success")
    }
})

app.listen(5000, function (error) {
    if (error) {
        console.log(error)
    } else {
        console.log('server listening on port ' + Port)
    }
})

var data = {}

function Read(Dir) {
    let files = fs.readdirSync(Dir)
    var localdata = {}

    // fs.readFileSync(Dir + '\\' + File, 'utf8')
    // fs.writeFileSync('index.json', JSON.stringify(data))

    files.forEach((File) => {
        const Split = File.split('.')
        const LastElement = Dir.split('/').pop()

        if ((LastElement === Split[0] && Split[1] == 'lua') || Split[2] == 'lua' && LastElement === Split[0]) {
            if (Split[1] == 'server') { // test.client.lua || test.server.lua
                const rs = fs.readFileSync(Dir + '/' + File, 'utf8')
                    localdata['__init__.server.lua'] = rs
            } else if (Split[1] == 'client') {
                const rs = fs.readFileSync(Dir + '/' + File, 'utf8')
                    localdata['__init__.client.lua'] = rs
            } else {
                const rs = fs.readFileSync(Dir + '/' + File, 'utf8')
                    localdata['__init__.lua'] = rs
            }

        } else {

            if (Split[1] == 'lua') { // test.lua
                const rs = fs.readFileSync(Dir + '/' + File, 'utf8')
                    localdata[File] = rs
            } else if (Split[2] == 'lua' && Split[1] == 'client' || Split[1] == 'server') { // test.client.lua || test.server.lua
                const rs = fs.readFileSync(Dir + '/' + File, 'utf8')
                    localdata[File] = rs
            }else { // Folder
                localdata[File] = Read(Dir + '/' + File)
            }
        }
    })

    return localdata
}

function ReadIfExist(current, past) {
    if (past == null || past.length == 0) return

    var localdata = {}
    for (const [key, value] of Object.entries(past)) {
        var curval = current[key]
        if (key == '__deleted__') continue
        if (typeof value == 'object' && typeof curval == 'object') {
            const content = ReadIfExist(curval, value)
            if (content != null) localdata[key] = content
        } else if (value != curval && typeof value != typeof curval) {
            localdata[key] = 'deleted'
        }
    }

    if (Object.size(localdata) == 0) { return null } else return localdata
}

function RemoveCopy(cur, past) {
    if (past == null || past.length == 0) return
    var New = {}
    for (const [key, value] of Object.entries(cur)) {
        var pastval = past[key]
        if (key == '__deleted__') { New[key] = value }
        if (typeof value == 'object') {
            const content = RemoveCopy(value, pastval)
            if (content != null) New[key] = content
        } else if (pastval != value) {
            New[key] = value
        }
    }
    if (Object.size(New) == 0) { return null } else return New
}

var previousContent = []

app2.get('/', function (req, res) {
    const content = Read('./game')
    if (previousContent == null) previousContent = content
    const deletedContents = ReadIfExist(content, previousContent)
    content.__deleted__ = JSON.stringify(deletedContents)

    res.send(JSON.stringify(RemoveCopy(content, previousContent)))
    previousContent = JSON.parse(JSON.stringify(content))
})