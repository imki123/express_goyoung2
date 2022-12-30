import { Router } from 'express'
import axios from 'axios'

export const catbookRouter = Router()

const urls = {
  getAnimal: '/getAnimal/:animal/:breed',
}

catbookRouter.get(urls.getAnimal, (req, res) => {
  const { animal, breed } = req.params
  const url = `https://api.the${animal}api.com/v1/images/search?breed_ids=${breed}`

  axios(url, {
    headers: { 'x-api-key': process.env.CAT_API_KEY }, //cat-api
  })
    .then((result) => {
      // console.log(res.data)
      res.send(result.data)
    })
    .catch((e) => {
      console.error('error:', url, e?.message ? e.message : e)
      res.status(500).send('fail:' + url)
    })
})
