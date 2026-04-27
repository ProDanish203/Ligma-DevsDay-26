import { PaginationInfo } from 'src/common/types/type';
import { LogSelect } from '../queries';

export interface GetAllEntityLogsResponse {
  logs: LogSelect[];
  pagination: PaginationInfo;
}
