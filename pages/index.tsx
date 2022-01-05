import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { ChainId, Currency, CurrencyAmount, Fraction, Percent, Token, TokenAmount } from '@dynamic-amm/sdk'
import { getData } from 'kyberswap-aggregator-sdk'
import { ethers } from 'ethers'
import BigNumber from 'bignumber.js'
import autosize from 'autosize'
import copy from 'copy-to-clipboard'

const DEFAULT_CUSTOM_TRADE_ROUTE = `[
  [
    {
      "pool": "0xe84ec9cde7f8e45c68668437634c1c0b2de3296c",
      "tokenIn": "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
      "tokenOut": "0xfe56d5892bdffc7bf58f2e84be1b2c32d21c308b",
      "swapAmount": "1000000000000",
      "amountOut": "0",
      "limitReturnAmount": "0",
      "maxPrice": "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "exchange": "kyberswap",
      "poolLength": 2,
      "poolType": "dmm"
    }
  ]
]`

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
  const [chargeFeeBy, setChargeFeeBy] = useState<'currency_in' | 'currency_out'>('currency_in')
  const [feeReceiver, setFeeReceiver] = useState('0x16368dD7e94f177B8C2c028Ef42289113D328121')
  const [feeAmount, setFeeAmount] = useState('1000') // 1000 bps = 1000 * 0.01% = 10%
  const [isInBps, setIsInBps] = useState(true)

  const [isUseCustomTradeRoute, setIsUseCustomTradeRoute] = useState(true)
  const [customTradeRoute, setCustomTradeRoute] = useState(DEFAULT_CUSTOM_TRADE_ROUTE)

  const [outputAmount, setOutputAmount] = useState<string>()
  const [methodName, setMethodName] = useState<string>()
  const [ethValue, setEthValue] = useState<string>()
  const [args, setArgs] = useState<Array<string | Array<string | string[]>> | undefined>()
  const [rawExecutorData, setRawExecutorData] = useState<unknown>()
  const [isUseSwapSimpleMode, setIsUseSwapSimpleMode] = useState<boolean>()
  const [tradeRoute, setTradeRoute] = useState<any[][]>()

  useEffect(() => {
    autosize(document.querySelectorAll('textarea'))
    if (args) {
      const copyButtons = document.querySelectorAll('.copy')
      copyButtons.forEach((button) =>
        button.addEventListener('click', () => {
          button.innerHTML = 'copied'
          setTimeout(() => {
            button.innerHTML = 'copy'
          }, 300)
        })
      )
    }
    return () => {}
  }, [args])

  const onSubmit = async () => {
    onClear()
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
      customTradeRoute: isUseCustomTradeRoute ? customTradeRoute : undefined,
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
    if (data.tradeRoute) setTradeRoute(data.tradeRoute)
  }

  const onClear = () => {
    setOutputAmount('')
    setMethodName('')
    setEthValue('')
    setArgs(undefined)
  }

  return (
    <div>
      <Head>
        <title>KyberSwap Aggregator SDK</title>
        <meta name="description" content="KyberSwap Aggregator SDK" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <h1>KyberSwap Aggregator SDK</h1>
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
                      checked={chargeFeeBy === 'currency_in'}
                      onChange={() => setChargeFeeBy('currency_in')}
                    />{' '}
                    Token in
                    <input
                      type="radio"
                      checked={chargeFeeBy === 'currency_out'}
                      onChange={() => setChargeFeeBy('currency_out')}
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
                    {isInBps ? 'bps' : chargeFeeBy === 'currency_in' ? 'currency in' : 'currency out'}
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
          <section>
            <div>Trade route:</div>
            <ul>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Use custom trade route?</span>
                <input
                  type="radio"
                  checked={isUseCustomTradeRoute}
                  onChange={() => setIsUseCustomTradeRoute(true)}
                />{' '}
                True
                <input
                  type="radio"
                  checked={!isUseCustomTradeRoute}
                  onChange={() => setIsUseCustomTradeRoute(false)}
                />{' '}
                False
              </li>
              {isUseCustomTradeRoute && (
                <li>
                  <div style={{ width: '200px' }}>Custom trade route:</div>
                  <textarea
                    style={{
                      width: 'calc(100% - 32px)',
                      minHeight: '16px',
                    }}
                    value={customTradeRoute}
                    onChange={(e) => setCustomTradeRoute(e.currentTarget.value)}
                  />
                </li>
              )}
            </ul>
          </section>
          <button onClick={onSubmit}>Submit</button>
          <button onClick={onClear}>Clear output</button>
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
          <section>
            <span>args:&nbsp;</span>
            <button onClick={() => copy(JSON.stringify(args))} className="copy">
              copy
            </button>
            <pre>{JSON.stringify(args, null, 2)}</pre>
          </section>
          <br />
          {args && (
            <>
              <section>
                <span>swapDesc:&nbsp;</span>
                <button onClick={() => copy(JSON.stringify(args[1]))} className="copy">
                  copy
                </button>
                <pre>{JSON.stringify(args[1], null, 2)}</pre>
              </section>
              <br />
              <section>
                <span>executorData:&nbsp;</span>
                <button onClick={() => copy(JSON.stringify(args[2]))} className="copy">
                  copy
                </button>
                <pre>{JSON.stringify(args[2], null, 2)}</pre>
              </section>
              <br />
              <section>
                <span>rawExecutorData:&nbsp;</span>
                <button onClick={() => copy(JSON.stringify(rawExecutorData))} className="copy">
                  copy
                </button>
                <pre>{JSON.stringify(rawExecutorData, null, 2)}</pre>
              </section>
              <br />
              <section>
                <span>isUseSwapSimpleMode:&nbsp;</span>
                {isUseSwapSimpleMode ? 'YES' : 'NO'}
              </section>
              <br />
              <section>
                <span>tradeRoute:&nbsp;</span>
                <button onClick={() => copy(JSON.stringify(tradeRoute))} className="copy">
                  copy
                </button>
                <pre>{JSON.stringify(tradeRoute, null, 2)}</pre>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
