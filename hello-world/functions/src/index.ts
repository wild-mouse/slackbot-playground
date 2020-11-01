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

export const helloWorld = functions.https.onRequest(async (request, response) => {
  functions.logger.debug("Request body: ", request.body);
  const text: string = request.body.text;
  const symbol = text.toLowerCase()
  const errorResponse = {
    response_type: "ephemeral",
    text: `Token not found: Token symbol: ${symbol}`
  }
  if (!text || text.split(" ").length !== 1) {
    response.status(200).send(errorResponse)
    return
  }
  const getListUrl = "https://api.coingecko.com/api/v3/coins/list"
  const list: TokenIndex[] = await axios.get(getListUrl)
      .then((res: AxiosResponse<TokenIndex[]>) => res.data)

  const index = list.find((tokenIndex) => tokenIndex.symbol === symbol)
  if (index === undefined) {
    functions.logger.info(`Token not found. CoinGecko token symbol: ${symbol}`);
    response.status(200).send(errorResponse)
    return
  }

  const getTokenUrl = `https://api.coingecko.com/api/v3/coins/${index.id}`
  const token = await axios.get(getTokenUrl)
      .then((res: AxiosResponse<Token>) => res.data)
  if (token === undefined) {
    functions.logger.info(`Token not found. CoinGecko token id: ${index.id}`);
    response.status(200).send(errorResponse)
    return
  }

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
  const botResponse: BotResponse = { "blocks": [ sectionBlock, imageBlock ] }
  response.send(botResponse);
});
