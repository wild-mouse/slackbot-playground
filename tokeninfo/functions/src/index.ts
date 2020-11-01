import * as functions from 'firebase-functions';
import axios, { AxiosResponse } from "axios"

interface TokenIndex {
  id: string,
  symbol: string,
  name: string
}

interface Token {
  name: string
  symbol: string
  image: {
    thumb: string
    small: string
    large: string
  }
  market_data: {
    current_price: {
      jpy: number
      usd: number
    }
  }
}

interface SectionBlock {
  type: "section",
  text: {
    type: string
    text: string
  }
}

interface ImageBlock {
  type: "image"
  image_url: string
  alt_text: string
}

interface BotResponse {
  blocks: Array<SectionBlock | ImageBlock>
}

const prepareTokensInfo = (tokens: TokenIndex[], symbol: string): BotResponse => {
  const blockText: string = `Found a ${symbol.toUpperCase()} tokens.\n` +
      tokens.map(token => {
        return `• Name: ${token.name}, Symbol: ${token.symbol.toUpperCase()}`
      }).join("\n")
  const sectionBlock: SectionBlock = {
    type: "section",
    text: {type: "mrkdwn", text: blockText}
  }
  return {
    response_type: "in_channel",
    blocks: [sectionBlock]
  } as BotResponse
}

const prepareTokenInfo = (index: TokenIndex, token: Token): BotResponse => {
  const detailUrl: string = `https://www.coingecko.com/en/coins/${index.id}`
  const blockText: string = [
    `Found a ${token.symbol.toUpperCase()} token.`,
    `Token name: ${token.name}`,
    `Token symbol: ${token.symbol.toUpperCase()}`,
    `Current prices:`,
    `• JPY: ${token.market_data.current_price.jpy}`,
    `• USD: ${token.market_data.current_price.usd}`,
    `More detail: ${detailUrl}`
  ].join("\n")
  const sectionBlock: SectionBlock = {
    type: "section",
    text: { type: "mrkdwn", text: blockText }
  }
  const imageBlock: ImageBlock = {
    type: "image",
    image_url: token.image.small,
    alt_text: "Logo"
  }
  return {
    response_type: "in_channel",
    blocks: [ sectionBlock, imageBlock ]
  } as BotResponse
}

export const getToken = functions.https.onRequest(async (request, response) => {
  functions.logger.debug("Request body: ", request.body);
  const text: string = request.body.text;
  if (!text || text.split(" ").length !== 2) {
    response.status(200).send({
      response_type: "ephemeral",
      text: `Invalid request.`
    })
    return
  }
  const keyValue = text.split(" ")
  const getListUrl = "https://api.coingecko.com/api/v3/coins/list"
  const indexList: TokenIndex[] = await axios.get(getListUrl)
      .then((res: AxiosResponse<TokenIndex[]>) => res.data)
  if (keyValue[0] !== "name" && keyValue[0] !== "symbol") {
    response.status(200).send({
      response_type: "ephemeral",
      text: `Invalid request.`
    })
    return
  }

  const key = keyValue[0].toLowerCase() as "name" | "symbol"
  const value = keyValue[1].toLowerCase()
  if (key === "symbol") {
    const foundTokens = indexList.filter(target => target.symbol === value)
    if (foundTokens.length > 1) {
      response.send(prepareTokensInfo(foundTokens, value));
      return
    }
  }

  const index = indexList.find((tokenIndex) => tokenIndex[key].toLowerCase() === value)
  if (index === undefined) {
    response.status(200).send({
      response_type: "ephemeral",
      text: `Token not found.`
    })
    return
  }
  const getTokenUrl = `https://api.coingecko.com/api/v3/coins/${index.id}`
  const token = await axios.get(getTokenUrl)
      .then((res: AxiosResponse<Token>) => res.data)
  if (token === undefined) {
    response.status(200).send({
      response_type: "ephemeral",
      text: `Token not found.`
    })
    return
  }

  response.send(prepareTokenInfo(index, token));
});
