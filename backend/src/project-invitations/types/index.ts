import { PaginationInfo } from 'src/common/types/type';
import { ProjectInvitationSelect } from '../queries';

export interface GetAllProjectInvitationsResponse {
  invitations: ProjectInvitationSelect[];
  pagination: PaginationInfo;
}
