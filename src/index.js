const Koa = require('koa')
const Router = require('@koa/router')
const mysql = require('mysql2/promise')
const path = require('path')
const KoaBody = require('koa-body')
const fs = require('fs')
const app = new Koa()
const router = new Router()
const http = require('http')
const utils = require('./utils')
const staticCache = require('koa-static-cache')

const p = utils.partial(path.join, __dirname)

let connection
app.use(async (ctx, next) => {
  console.log(ctx.host, ctx.method, ctx.origin,ctx.url)
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Content-Length, Authorization, Accept, X-Requested-With'
  )
  ctx.set('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, POST, DELETE')
  await next()
})

app.use(async (ctx, next) => {
  if (!connection) {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'komori',
      database: 'user_db'
    })
  }

  await next()
})

app.use(staticCache({
  prefix: '/public',
  dir: './public',
  dynamic: true,
  gzip: true
}))

router.get('/', async ctx => {
  ctx.redirect('/login')
})

router.get('/favicon.ico', async ctx => {
  ctx.body = fs.readFileSync(p('./favicon.ico'))
})

router.get('/users', async ctx => {
  let [users] = await connection.query('SELECT * FROM `user_db`.user')
  console.log(users)
  ctx.set('Content-Type', 'text/html;charset=utf-8')
  ctx.body = `
        <h1>hello</h1>
        <ul>
        ${users.reduce((a, b) => {
          return a + `<li>${b.id}--${b.username}</li>`
        }, '')}
        </ul>
  `
})

router.get('/add', async ctx => {
  ctx.set('Content-Type', 'text/html;charset=utf-8')
  ctx.body = fs.readFileSync(p('pgae/add.html'), 'utf-8')
})

router.post('/add', async ctx => {
  const body = await new Promise(resolve => {
    let str = ''
    ctx.req.on('data', e => {
      console.log((str += e.toString()))
    })
    ctx.req.on('end', () => {
      str = str.split('&')
      let body = {}
      str.forEach(s => {
        const query = s.split('=')
        body[query[0]] = query[1]
      })
      resolve(body)
    })
  })
  await connection.query(
    'insert into `user_db`.user (`username`, `password`, `gender`) values (?,?,?)',
    [decodeURI(body.username), decodeURI(body.password), decodeURI(body.gender)]
  )
  ctx.body = '<h1>添加成功</h1><a href="/login">去登录</a>'
})

router.get('/login', async ctx => {
  ctx.set('Content-Type', 'text/html;charset=utf-8')
  ctx.body = fs.readFileSync(p('pgae/login.html'), 'utf-8')
})

router.post('/login', KoaBody({ multipart: true }), async ctx => {
  const { username, password } = ctx.request.body
  console.log(username, password)
  const sql = 'select * from `user_db`.user where `username`=?'
  const [[user]] = await connection.query(sql, [username])

  ctx.set('Content-Type', 'application/json')
  if (!user) {
    return (ctx.body = '用户不存在')
  }

  if (user.password !== password) {
    return (ctx.body = '密码错误')
  }

  ctx.body = {
    data: user,
    state: 200
  }
})

router.get('/user/:id(\\d+)', async (ctx, next) => {
  const { id } = ctx.request.params
  const sql = 'select * from `user_db`.user where `id`=?'
  const [[data]] = await connection.query(sql, [id])
  // console.log(data)
  ctx.body = fs
    .readFileSync(p('pgae/user.html'), 'utf-8')
    .replace(/{{(\w+)}}/g, (_, key) => data[key])
})

router.post(
  '/change',
  KoaBody({ multipart: true, formidable: { uploadDir: './public/avatar', keepExtensions: true } }),
  async (ctx, next) => {
    const { password, id } = ctx.request.body
    const { avatar } = ctx.request.files

    console.log(avatar)
    const body = [password]
    let sql = 'update `user_db`.user set `password`=?'
    if (avatar) {
      sql += ', avatar=?'
      body.push(avatar.path)
    }

    sql += ' where `id`=?'
    await connection.query(sql, [...body, id])
    ctx.body = '修改成功'
  }
)

app.use(router.routes()).use(router.allowedMethods())

http.createServer(app.callback()).listen(3001, () => console.log('ok'))

app.listen(3000, () => {
  console.log('连接成功')
})
