import React from 'react';
import { CandidateAssigned, ExamConfig } from '../../types';
import { InvigilatorManagementView } from '../invigilators/InvigilatorManagementView';

interface ProctorAssignmentModuleProps {
  candidates?: CandidateAssigned[];
  totalRoomsFromApp?: number;
  config: ExamConfig;
}

export const ProctorAssignmentModule: React.FC<ProctorAssignmentModuleProps> = ({
  candidates = [],
  totalRoomsFromApp = 0,
  config,
}) => {
  return (
    <InvigilatorManagementView
      schoolName={config.schoolName || 'TRƯỜNG THPT NGUYỄN HUỆ'}
      defaultRoomCount={totalRoomsFromApp > 0 ? totalRoomsFromApp : 24}
    />
  );
};
