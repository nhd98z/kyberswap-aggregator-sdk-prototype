import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { ChainId } from '@dynamic-amm/sdk'
import { ETHER_ADDRESS, getData } from '@kyberswap/aggregator-sdk'
import DMM_ABI from '@kyberswap/aggregator-sdk/dist/abis/dmm-router-v2.json'
import BigNumber from 'bignumber.js'
import autosize from 'autosize'
import copy from 'copy-to-clipboard'
import { Contract } from '@ethersproject/contracts'
import useConnectWalletCallback from 'hooks/useConnectWalletCallback'
import { useActiveWeb3React } from 'hooks/useActiveWeb3React'

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
  const [currencyIn, setCurrencyIn] = useState(ETHER_ADDRESS)
  const [decimalIn, setDecimalIn] = useState(18)

  const [currencyOut, setCurrencyOut] = useState('0xfe56d5892BDffC7BF58f2E84BE1b2C32D21C308b')
  const [decimalOut, setDecimalOut] = useState(18)

  const [slippage, setSlippage] = useState('0.5')
  const [minAmountOut, setMinAmountOut] = useState('1')
  const [recipient, setRecipient] = useState('0x16368dD7e94f177B8C2c028Ef42289113D328121')
  const [deadline, setDeadline] = useState(20) // minutes

  const [isChargeFee, setIsChargeFee] = useState(false)
  const [chargeFeeBy, setChargeFeeBy] = useState<'currency_in' | 'currency_out'>('currency_in')
  const [feeReceiver, setFeeReceiver] = useState('0xDa0D8fF1bE1F78c5d349722A5800622EA31CD5dd')
  const [feeAmount, setFeeAmount] = useState('8') // 8 bps = 8 * 0.01% = 0.8%
  const [isInBps, setIsInBps] = useState(true)

  const [isUseCustomTradeRoute, setIsUseCustomTradeRoute] = useState(false)
  const [customTradeRoute, setCustomTradeRoute] = useState(DEFAULT_CUSTOM_TRADE_ROUTE)

  const [methodName, setMethodName] = useState<string>()
  const [ethValue, setEthValue] = useState<string>('0x0')
  const [args, setArgs] = useState<Array<string | Array<string | string[]>> | undefined>()
  const [rawExecutorData, setRawExecutorData] = useState<unknown>()
  const [isUseSwapSimpleMode, setIsUseSwapSimpleMode] = useState<boolean>()
  const [tradeRoute, setTradeRoute] = useState<any[][]>()

  useEffect(() => {
    if (isUseCustomTradeRoute) {
      autosize(document.querySelectorAll('textarea'))
    }
  }, [isUseCustomTradeRoute])

  useEffect(() => {
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
  }, [args])

  const updateMinAmountOut = async () => {
    const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    const WMATIC = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'
    const WBNB = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'
    const WAVAX = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7'
    const WFTM = '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83'
    const WCRO = '0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23'
    const WRAPPED_NATIVE_TOKEN: { [p: string]: string } = {
      [ChainId.MAINNET]: WETH,
      [ChainId.MATIC]: WMATIC,
      [ChainId.BSCMAINNET]: WBNB,
      [ChainId.AVAXMAINNET]: WAVAX,
      [ChainId.FANTOM]: WFTM,
      [ChainId.CRONOS]: WCRO,
    }
    const amountInBn = new BigNumber(amountIn).times(10 ** decimalIn)
    const feeInBn =
      isChargeFee && chargeFeeBy === 'currency_in'
        ? isInBps
          ? new BigNumber(amountInBn).times(feeAmount ?? '0.5').div(10000)
          : new BigNumber(feeAmount).times(10 ** decimalIn)
        : new BigNumber('0')
    const amountInAfterFeeInBn = amountInBn.minus(feeInBn)
    const fetchArgs = {
      path:
        network === ChainId.MAINNET
          ? 'ethereum'
          : network === ChainId.MATIC
          ? 'polygon'
          : network === ChainId.BSCMAINNET
          ? 'bsc'
          : network === ChainId.AVAXMAINNET
          ? 'avalanche'
          : network === ChainId.FANTOM
          ? 'fantom'
          : network === ChainId.CRONOS
          ? 'cronos'
          : null,
      tokenIn: currencyIn === ETHER_ADDRESS ? WRAPPED_NATIVE_TOKEN[network] : currencyIn,
      tokenOut: currencyOut === ETHER_ADDRESS ? WRAPPED_NATIVE_TOKEN[network] : currencyOut,
      amountIn: amountInAfterFeeInBn.toFixed(),
    }
    const response = await fetch(
      `https://aggregator-api.kyberswap.com/${fetchArgs.path}/route?tokenIn=${fetchArgs.tokenIn}&tokenOut=${fetchArgs.tokenOut}&amountIn=${fetchArgs.amountIn}`
    )
    const outputAmount = (await response.json()).outputAmount
    let newMinAmountOut = new BigNumber(outputAmount)
    if (isChargeFee && chargeFeeBy === 'currency_out') {
      newMinAmountOut = isInBps ? newMinAmountOut.times(1 - +feeAmount / 10000) : newMinAmountOut.minus(feeAmount)
    }
    newMinAmountOut = newMinAmountOut.div(1 + +slippage / 100)
    setMinAmountOut(newMinAmountOut.integerValue(BigNumber.ROUND_HALF_UP).toFixed())
  }

  const onSubmit = async () => {
    onClear()
    if (new BigNumber(minAmountOut).lt(1) || !new BigNumber(minAmountOut).isInteger()) {
      alert('Min amount out must be a positive integer.')
      return
    }
    const amountInBn = new BigNumber(amountIn).times(10 ** decimalIn)
    const feeInBn =
      isChargeFee && chargeFeeBy === 'currency_in'
        ? isInBps
          ? new BigNumber(amountInBn).times(feeAmount).div(10000)
          : new BigNumber(feeAmount).times(10 ** decimalIn)
        : new BigNumber('0')
    const amountInAfterFeeInBn = amountInBn.minus(feeInBn)
    const data = await getData({
      chainId: network,
      currencyInAddress: currencyIn,
      currencyInDecimals: decimalIn,
      amountIn: amountInAfterFeeInBn.toFixed(),
      currencyOutAddress: currencyOut,
      currencyOutDecimals: decimalOut,
      tradeConfig: {
        minAmountOut,
        recipient,
        deadline: Date.now() + deadline * 60 * 1000,
      },
      feeConfig: isChargeFee
        ? {
            chargeFeeBy,
            feeReceiver,
            feeAmount: isInBps
              ? feeAmount
              : chargeFeeBy === 'currency_in'
              ? new BigNumber(feeAmount).times(10 ** decimalIn).toFixed()
              : new BigNumber(feeAmount).times(10 ** decimalOut).toFixed(),
            isInBps,
          }
        : undefined,
      customTradeRoute: isUseCustomTradeRoute ? customTradeRoute : undefined,
    })
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
    setMethodName('')
    setEthValue('')
    setArgs(undefined)
  }

  const onConnect = useConnectWalletCallback()

  const { account, library } = useActiveWeb3React()

  const onSwap = async () => {
    const contract = new Contract(
      '0xdf1a1b60f2d438842916c0adc43748768353ec25',
      DMM_ABI,
      account && library ? library.getSigner(account) : library
    )
    const signer = library?.getSigner()
    if (account && args && signer) {
      await contract['swap'](...args, ethValue === '0' ? { from: account } : { value: ethValue, from: account })
    }
  }

  return (
    <div>
      <Head>
        <title>KyberSwap Aggregator SDK</title>
        <meta name="description" content="KyberSwap Aggregator SDK" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <h1>KyberSwap Aggregator SDK v0.1.11</h1>
      <div style={{ display: 'flex', background: 'whitesmoke' }}>
        <div style={{ width: '50%', background: 'lightcyan' }}>
          <section>
            <div>Account: {account ? account : <button onClick={onConnect}>connect</button>}</div>
          </section>
          <br />
          <section>
            <div>Network:</div>
            <select
              style={{ width: '153px' }}
              value={network}
              onChange={(e) => setNetwork(+e.currentTarget.value as any)}
            >
              <option value={ChainId.MAINNET}>Ethereum</option>
              <option value={ChainId.MATIC}>Polygon</option>
              <option value={ChainId.BSCMAINNET}>Binance Smart Chain</option>
              <option value={ChainId.AVAXMAINNET}>Avalanche</option>
              <option value={ChainId.FANTOM}>Fantom</option>
              <option value={ChainId.CRONOS}>Cronos</option>
            </select>
          </section>
          <br />

          <section>
            <div>Amount in:</div>
            <input type="number" value={amountIn} onChange={(e) => setAmountIn(e.currentTarget.value)} />
            <div>Currency in ({ETHER_ADDRESS} = native token):</div>
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
            <div>Currency out ({ETHER_ADDRESS} = native token):</div>
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
                <span style={{ display: 'inline-block', width: '200px' }}>Slippage:</span>
                <input
                  type="number"
                  style={{ margin: '0 4px', width: '40px' }}
                  value={slippage}
                  onChange={(e) => setSlippage(e.currentTarget.value)}
                />
                %
              </li>
              <li>
                <span style={{ display: 'inline-block', width: '200px' }}>Min amount out:</span>
                <input
                  type="text"
                  style={{ marginLeft: '4px', width: '333px' }}
                  value={minAmountOut}
                  onChange={(e) => setMinAmountOut(e.currentTarget.value)}
                />
                <button onClick={updateMinAmountOut}>Update</button>
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
                    Currency in
                    <input
                      type="radio"
                      checked={chargeFeeBy === 'currency_out'}
                      onChange={() => setChargeFeeBy('currency_out')}
                    />{' '}
                    Currency out
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
                    {isInBps
                      ? 'bps (8 bps = 8 * 0.01% = 0.08%)'
                      : chargeFeeBy === 'currency_in'
                      ? feeAmount && `= ${new BigNumber(feeAmount).times(10 ** decimalIn).toFixed()}`
                      : feeAmount && `= ${new BigNumber(feeAmount).times(10 ** decimalOut).toFixed()}`}
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
            <span>Method name:&nbsp;</span>
            {methodName && <button onClick={onSwap}>swap (support BSC only)</button>}
          </section>
          <br />
          <section>
            <span>ETH value:&nbsp;</span>
            {ethValue}
            <button onClick={() => copy(ethValue)} className="copy">
              copy
            </button>
          </section>
          <br />
          <section>
            <span>args:&nbsp;</span>
            <button onClick={() => copy(JSON.stringify(args))} className="copy">
              copy
            </button>
            <span style={{ marginLeft: '4px' }}>
              use this in{' '}
              <a href="https://dev-dmm-interface-pr-774.knstats.com/#/swap" target="_blank" rel="noreferrer">
                dev-dmm-interface-pr-774.knstats.com
              </a>
            </span>
            <pre>{JSON.stringify(args, null, 2)}</pre>
          </section>
          <br />
          {args && (
            <>
              <section>
                <span>isUseSwapSimpleMode:&nbsp;</span>
                {isUseSwapSimpleMode ? 'YES' : 'NO'}
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
