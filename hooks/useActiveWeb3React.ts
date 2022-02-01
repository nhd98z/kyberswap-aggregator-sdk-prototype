// eslint-disable-next-line import/no-unresolved
import { Web3ReactContextInterface } from '@web3-react/core/dist/types'
import { useWeb3React } from '@web3-react/core'
import { useMemo } from 'react'
import { ethers } from 'ethers'

export const simpleRpcProvider = new ethers.providers.StaticJsonRpcProvider(
  'https://bsc.dmm.exchange/v1/mainnet/geth?appId=prod-dmm-interface'
)

export function useActiveWeb3React(): Web3ReactContextInterface<ethers.providers.JsonRpcProvider> {
  const provider = useWeb3React()

  return useMemo(
    () => (provider.active ? provider : { ...provider, active: true, chainId: 56, library: simpleRpcProvider }),
    [provider]
  )
}
