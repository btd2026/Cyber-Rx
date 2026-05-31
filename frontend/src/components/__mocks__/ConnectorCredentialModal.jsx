import React from 'react';

const ConnectorCredentialModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;
  return <div data-testid="credential-modal">ConnectorCredentialModal</div>;
};

export default ConnectorCredentialModal;
