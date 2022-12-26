import { Router } from 'express'
import { Sheet } from '../../model/accountBookSheet'

const sheetRouter = Router()
/**
 * accountBook에서 사용하는 api
 * get(/accountBook/sheet/) : { (sheetId: number, name: string)[] }
 * get(/accountBook/sheet/:sheetId) : {
 *   sheetId: number,
 *   name: string,
 *   data: (string | number)[][]
 * }
 * */

// 라우터 설정

// sheet 목록 전체 불러오기
sheetRouter.get('/', async (req, res) => {
  try {
    const sheet = await Sheet.find().sort({ order: 1 })
    if (sheet) res.send(sheet)
    else res.status(204).send(false) //No Content
  } catch (e) {
    res.status(500).send(e)
  }
})

// sheetId로 불러오기
sheetRouter.get('/:sheetId', async (req, res) => {
  try {
    const { sheetId } = req.params
    const sheet = await Sheet.findOne({ sheetId: sheetId })
    if (sheet) res.send(sheet)
    else res.status(204).send(false) //No Content
  } catch (e) {
    res.status(500).send(e)
  }
})

// sheet 추가
sheetRouter.post('/', async (req, res) => {
  try {
    //sheetId 생성
    let sheetId = 1
    let order = 1
    const sheets = await Sheet.find().sort({ sheetId: 1 })
    if (sheets.length > 0) {
      sheetId = sheets[sheets.length - 1].sheetId || 1 + 1
      order = sheetId
    }
    const sheet = new Sheet({
      sheetId: sheetId,
      name: 'Sheet' + sheetId,
      order: order,
      table: [],
    })
    await sheet.save()
    res.send(true)
  } catch (e) {
    res.status(500).send(e)
  }
})

// sheet 업데이트
sheetRouter.patch('/:sheetId', async (req, res) => {
  const { sheetId } = req.params
  try {
    // sheetId로 찾고 업데이트
    const updated = await Sheet.findOneAndUpdate(
      { sheetId: sheetId },
      {
        ...req.body,
      },
      { new: true } // 업데이트 후의 데이터를 반환, false라면 업데이트 전의 데이터 반환
    )
    if (updated) {
      res.send(true)
    } else {
      res.status(204).send(false) //No content
      return
    }
  } catch (e) {
    res.status(500).send(e)
  }
})
// sheet 순서 변경 {fromId, toId}
sheetRouter.patch('/:fromId/:toId', async (req, res) => {
  const { fromId, toId } = req.params
  try {
    // sheetId로 찾고 업데이트
    const fromSheet = await Sheet.findOne({ sheetId: fromId })
    const toSheet = await Sheet.findOne({ sheetId: toId })
    const fromOrder = fromSheet?.order
    const toOrder = toSheet?.order

    // const fromSheetResult =
    await Sheet.findOneAndUpdate(
      { sheetId: fromId },
      {
        order: toOrder,
      },
      { new: true } // 업데이트 후의 데이터를 반환, false라면 업데이트 전의 데이터 반환
    )
    // const toSheetResult =
    await Sheet.findOneAndUpdate(
      { sheetId: toId },
      {
        order: fromOrder,
      },
      { new: true } // 업데이트 후의 데이터를 반환, false라면 업데이트 전의 데이터 반환
    )
    if (fromSheet && toSheet) {
      res.send(true)
    } else {
      res.status(204).send(false) //No content
      return
    }
    return
  } catch (e) {
    res.status(500).send(e)
  }
})
// sheet 삭제
sheetRouter.delete('/:sheetId', async (req, res) => {
  const { sheetId } = req.params
  try {
    // sheetId로 찾고 업데이트
    const deleted = await Sheet.findOneAndDelete({ sheetId: sheetId })
    if (deleted) {
      res.send(true)
    } else {
      res.status(204).send(false) //No content
      return
    }
    return
  } catch (e) {
    res.status(500).send(e)
  }
})

export default sheetRouter
