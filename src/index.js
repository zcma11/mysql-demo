const Koa = require('koa')
const Router = require('@koa/router')
const mysql = require('mysql2/promise')
const path = require('path')
const fs = require('fs')
const app = new Koa()
const router = new Router()

let connection
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

router.get('/user', async ctx => {
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
  ctx.body = fs.readFileSync(path.join(__dirname, 'pgae/add.html'), 'utf-8')
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000, () => {
  console.log('连接成功')
})
