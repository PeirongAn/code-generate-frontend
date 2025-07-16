import React from "react";
import { Button } from "../../common/Button";
import { Message } from "../../types/datamodel";

interface ConfirmationRendererProps {
  message: Message;
  onConfirm?: (text: string) => void;
  onCancel?: () => void;
}

const ConfirmationRenderer: React.FC<ConfirmationRendererProps> = ({
  message,
  onConfirm,
  onCancel,
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm("确认规划");
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="my-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-gray-800">
      <p className="text-gray-800 dark:text-gray-200">
        {message.data?.message}
      </p>
      <div className="mt-4 flex justify-end space-x-2">
        {onCancel && (
          <Button onClick={handleCancel} variant="secondary">
            取消
          </Button>
        )}
        {onConfirm && (
          <Button onClick={handleConfirm} variant="primary">
            确认
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConfirmationRenderer; 