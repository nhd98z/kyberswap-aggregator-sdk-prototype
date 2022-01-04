import type { NextPage } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { ChainId, Currency, CurrencyAmount, Fraction, Percent, Token, TokenAmount } from '@dynamic-amm/sdk'
import { getData } from 'kyberswap-aggregator-sdk'
import { ethers } from 'ethers'
import { SwapV2Parameters } from 'kyberswap-aggregator-sdk/dist/types'
import BigNumber from 'bignumber.js'

const Home: NextPage = () => {
  const [network, setNetwork] = useState(ChainId.BSCMAINNET)

  const [amountIn, setAmountIn] = useState('0.000001')
  const [currencyIn, setCurrencyIn] = useState('ETH')
  const [decimalIn, setDecimalIn] = useState(18)

  const [currencyOut, setCurrencyOut] = useState('0xfe56d5892BDffC7BF58f2E84BE1b2C32D21C308b')
  const [decimalOut, setDecimalOut] = useState(18)

  const [saveGas, setSaveGas] = useState(false)
  const [allowedSlippage, setAllowedSlippage] = useState(5)
  const [recipient, setRecipient] = useState('0x16368dD7e94f177B8C2c028Ef42289113D328121')
  const [deadline, setDeadline] = useState(20) // minutes

  const [isChargeFee, setIsChargeFee] = useState(true)
  const [chargeFeeBy, setChargeFeeBy] = useState<'tokenIn' | 'tokenOut'>('tokenIn')
  const [feeReceiver, setFeeReceiver] = useState('0x16368dD7e94f177B8C2c028Ef42289113D328121')
  const [feeAmount, setFeeAmount] = useState('1000') // 1000 bps = 1000 * 0.01% = 10%
  const [isInBps, setIsInBps] = useState(true)

  const [outputAmount, setOutputAmount] = useState<string>()
  const [methodName, setMethodName] = useState<string>()
  const [ethValue, setEthValue] = useState<string>()
  const [args, setArgs] = useState<Array<string | Array<string | string[]>> | undefined>()
  const [rawExecutorData, setRawExecutorData] = useState<unknown>()
  const [isUseSwapSimpleMode, setIsUseSwapSimpleMode] = useState<boolean>()
  const [tradeSwaps, setTradeSwaps] = useState<any[][]>()

  const onSubmit = async () => {
    const data = await getData({
      currencyAmountIn:
        currencyIn === 'ETH'
          ? CurrencyAmount.ether(ethers.utils.parseEther(amountIn).toString())
          : new TokenAmount(
              new Token(network, currencyIn, decimalIn),
              new BigNumber(amountIn).times(10 ** decimalIn).toString()
            ),
      currencyOut: currencyOut === 'ETH' ? Currency.ETHER : new Token(network, currencyOut, decimalOut),
      saveGas: saveGas,
      chainId: network,
      options: {
        allowedSlippage: new Percent((allowedSlippage * 100).toString(), '10000'),
        recipient: recipient,
        deadline: Date.now() + deadline * 60 * 1000,
      },
      feeConfig: isChargeFee
        ? {
            chargeFeeBy,
            feeReceiver,
            feeAmount,
            isInBps,
          }
        : undefined,
    })
    if (data.outputAmount) {
      const fraction = new Fraction(data.outputAmount, (10 ** decimalOut).toString())
      setOutputAmount(fraction.toSignificant(18))
    }
    if (data.swapV2Parameters) {
      setMethodName(data.swapV2Parameters.methodNames.join(','))
      setEthValue(data.swapV2Parameters.value)
      setArgs(data.swapV2Parameters.args)
    }
    if (data.rawExecutorData) setRawExecutorData(data.rawExecutorData)
    if (data.isUseSwapSimpleMode) setIsUseSwapSimpleMode(data.isUseSwapSimpleMode)
    if (data.tradeSwaps) setTradeSwaps(data.tradeSwaps)
  }

  return (
    <div>
      <Head>
        <title>Kyberswap SDK for Dextools</title>
        <meta name="description" content="KyberSwap SDK for Dextools" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <h1>KyberSwap SDK for Dextools</h1>
      <div style={{ display: 'flex', background: 'whitesmoke' }}>
        <div style={{ width: '50%', background: 'lightcyan' }}>
          <section>
            <div>Network:</div>
            <select
              style={{ width: '153px' }}
              value={network}
              onChange={(e) => setNetwork(+e.currentTarget.value as any)}
            >
              <option value={ChainId.MAINNET}>Ethereum</option>
              <option value={ChainId.BSCMAINNET}>Binance Smart Chain</option>
              <option value={ChainId.MATIC}>Polygon</option>
            </select>
          </section>
          <br />

          <section>
            <div>Amount in:</div>
            <input type="number" value={amountIn} onChange={(e) => setAmountIn(e.currentTarget.value)} />
            <div>Currency in (ETH = native token):</div>
            <input
              type="text"
              style={{ width: '333px' }}
              value={currencyIn}
              onChange={(e) => setCurrencyIn(e.currentTarget.value)}
            />
            <div>Decimal:</div>
            <input type="number" value={decimalIn} onChange={(e) => setDecimalIn(+e.currentTarget.value)} />
          </section>
          <br />

          <section>
            <div>Currency out (ETH = native token):</div>
            <input
              type="text"
              style={{ width: '333px' }}
              value={currencyOut}
              onChange={(e) => setCurrencyOut(e.currentTarget.value)}
            />
            <div>Decimal:</div>
            <input type="number" value={decimalOut} onChange={(e) => setDecimalOut(+e.currentTarget.value)} />
          </section>
          <br />

          <section>
            <div>Trade options:</div>
            <ul>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Save gas:</span>
                <input type="radio" checked={saveGas} onChange={() => setSaveGas(true)} /> True
                <input type="radio" checked={!saveGas} onChange={() => setSaveGas(false)} /> False
              </li>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Allowed slippage:</span>
                <input
                  type="number"
                  style={{ margin: '0 4px', width: '30px' }}
                  value={allowedSlippage}
                  onChange={(e) => setAllowedSlippage(+e.currentTarget.value)}
                />
                %
              </li>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Recipient:</span>
                <input
                  type="text"
                  style={{ marginLeft: '4px', width: '333px' }}
                  value={recipient}
                  onChange={(e) => setRecipient(e.currentTarget.value)}
                />
              </li>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Deadline:</span>
                <input
                  type="number"
                  style={{ margin: '0 4px', width: '30px' }}
                  value={deadline}
                  onChange={(e) => setDeadline(+e.currentTarget.value)}
                />
                minutes
              </li>
            </ul>
          </section>
          <br />
          <section>
            <div>Fee config:</div>
            <ul>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Charge fee?</span>
                <input type="radio" checked={isChargeFee} onChange={() => setIsChargeFee(true)} /> True
                <input type="radio" checked={!isChargeFee} onChange={() => setIsChargeFee(false)} /> False
              </li>
              {isChargeFee && (
                <>
                  <li>
                    <span style={{ display: 'inline-block', width: '200px' }}>Charge fee by:</span>
                    <input
                      type="radio"
                      checked={chargeFeeBy === 'tokenIn'}
                      onChange={() => setChargeFeeBy('tokenIn')}
                    />{' '}
                    Token in
                    <input
                      type="radio"
                      checked={chargeFeeBy === 'tokenOut'}
                      onChange={() => setChargeFeeBy('tokenOut')}
                    />{' '}
                    Token out
                  </li>
                  <li>
                    <span style={{ display: 'inline-block', width: '200px' }}>Fee receiver:</span>
                    <input
                      type="text"
                      style={{ marginLeft: '4px', width: '333px' }}
                      value={feeReceiver}
                      onChange={(e) => setFeeReceiver(e.currentTarget.value)}
                    />
                  </li>
                  <li>
                    <span style={{ display: 'inline-block', width: '200px' }}>Fee amount:</span>
                    <input
                      type="text"
                      style={{ margin: '0 4px' }}
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.currentTarget.value)}
                    />
                  </li>
                  <li>
                    <span style={{ display: 'inline-block', width: '200px' }}>Fee amount in bps?</span>
                    <input type="radio" checked={isInBps} onChange={() => setIsInBps(true)} /> True
                    <input type="radio" checked={!isInBps} onChange={() => setIsInBps(false)} /> False
                  </li>
                </>
              )}
            </ul>
          </section>
          <br />
          <button onClick={onSubmit}>Submit</button>
        </div>
        <div style={{ width: '50%', background: 'lightgreen' }}>
          <section>
            <span>Output amount:&nbsp;</span>
            {outputAmount}
          </section>
          <br />
          <section>
            <span>Method name:&nbsp;</span>
            {methodName}
          </section>
          <br />
          <section>
            <span>ETH value:&nbsp;</span>
            {ethValue}
          </section>
          <br />
          <section style={{ wordBreak: 'break-all' }}>
            <span>args:&nbsp;</span>
            {JSON.stringify(args)}
          </section>
          <br />
          {args && (
            <>
              <section style={{ wordBreak: 'break-all' }}>
                <span>swapDesc:&nbsp;</span>
                {JSON.stringify(args[1])}
              </section>
              <br />
              <section style={{ wordBreak: 'break-all' }}>
                <span>executorData:&nbsp;</span>
                {JSON.stringify(args[2])}
              </section>
              <br />
              <section style={{ wordBreak: 'break-all' }}>
                <span>rawExecutorData:&nbsp;</span>
                {JSON.stringify(rawExecutorData)}
              </section>
              <br />
              <section style={{ wordBreak: 'break-all' }}>
                <span>isUseSwapSimpleMode:&nbsp;</span>
                {isUseSwapSimpleMode ? 'YES' : 'NO'}
              </section>
              <br />
              <section style={{ wordBreak: 'break-all' }}>
                <span>tradeSwaps:&nbsp;</span>
                {JSON.stringify(tradeSwaps)}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
