import { PaginationInfo } from 'src/common/types/type';
import { ProjectSelect } from '../queries';

export interface GetAllProjectResponse {
  projects: ProjectSelect[];
  pagination: PaginationInfo;
}
