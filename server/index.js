const app = require('./app')

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  console.log(`Karigar Setu API listening on http://localhost:${port}`)
})
