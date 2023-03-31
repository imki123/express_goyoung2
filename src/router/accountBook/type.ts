import { Router } from 'express'
import { Type } from '../../model/accountBookType'

const typeRouter = Router()

// 라우터 설정
// /accountBook/type/

// type 불러오기
typeRouter.get('/', async (req, res) => {
  try {
    const types = await Type.findOne({ typeId: 1 })
    if (types) res.send(types)
    else res.status(204).send(false) //No Content
  } catch (e) {
    res.status(500).send(e)
  }
})

// type 변경하기
typeRouter.patch('/', async (req, res) => {
  try {
    // typeId로 찾고 업데이트
    const updated = await Type.findOneAndReplace(
      { typeId: 1 },
      {
        typeId: 1,
        types: req.body.types,
      },
      { new: true } // 업데이트 후의 데이터를 반환, false라면 업데이트 전의 데이터 반환
    )
    if (updated) {
      res.send(true)
    } else {
      res.status(204).send(false) //No Content
      return
    }
  } catch (e) {
    res.status(500).send(e)
  }
})

export default typeRouter
