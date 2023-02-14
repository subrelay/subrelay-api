import { Chain } from '../chain/chain.entity';

export enum AppEvent {
  BLOCK_WATCHER_START = 'block.watcher.start',
  BLOCK_WATCHER_STOP = 'block.watcher.stop',
  CHAIN_DELETE = 'chain.delete',
  JOB_STOP = 'job.stop',
  BLOCK_CREATED = 'block.created',
  EVENT_PROCESS = 'event.process',
}

export function getBlockWatcherJobName(chain: Chain) {
  return `${AppEvent.BLOCK_WATCHER_START}.${chain.chainId}`;
}
