"use client";

import type { UploadedDoc } from "./types";
import { Loader2, LogOut, AlertTriangle, Trash2 } from "lucide-react";

type ConfirmDialogsProps = {
  documents: UploadedDoc[];
  showClearConfirm: boolean;
  setShowClearConfirm: (v: boolean) => void;
  handleClearChat: () => void;
  showSignOutConfirm: boolean;
  setShowSignOutConfirm: (v: boolean) => void;
  signingOut: boolean;
  handleSignOut: () => void;
  fileToDelete: { id: string; name: string } | null;
  setFileToDelete: (v: null) => void;
  confirmRemoveDocument: () => void;
  showClearFilesConfirm: boolean;
  setShowClearFilesConfirm: (v: boolean) => void;
  confirmClearAllDocuments: () => void;
  convoToDelete: string | null;
  setConvoToDelete: (v: null) => void;
  confirmDeleteConversation: () => void;
};

export function ConfirmDialogs({
  documents, showClearConfirm, setShowClearConfirm, handleClearChat, showSignOutConfirm, setShowSignOutConfirm, signingOut, handleSignOut, fileToDelete, setFileToDelete, confirmRemoveDocument, showClearFilesConfirm, setShowClearFilesConfirm, confirmClearAllDocuments, convoToDelete, setConvoToDelete, confirmDeleteConversation,
}: ConfirmDialogsProps) {
  return (
<>
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Clear entire conversation?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                This will reset your current chat messages. Your uploaded document will remain loaded.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Sign out of DocuChat AI?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                You will need to sign back in to access your uploaded documents and chats.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                disabled={signingOut}
                onClick={() => setShowSignOutConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={signingOut}
                onClick={handleSignOut}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {signingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  "Sign Out"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single File Confirmation Dialog */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Remove uploaded file?</h3>
              <p className="text-xs text-[#6B6B73] mt-1 break-all">
                Are you sure you want to remove <span className="font-semibold text-[#2B2B2E]">"{fileToDelete.name}"</span>?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveDocument}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Remove File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Files Confirmation Dialog */}
      {showClearFilesConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Clear all uploaded files?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                All {documents.length} active documents will be removed. The assistant will switch to general chat mode.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearFilesConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearAllDocuments}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Conversation Confirmation Dialog */}
      {convoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2B2B2E]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl border border-[#E4E2DE] bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#2B2B2E]">Delete conversation?</h3>
              <p className="text-xs text-[#6B6B73] mt-1">
                This conversation will be permanently removed from your chat history.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConvoToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E4E2DE] bg-[#F3F2F0] hover:bg-white text-xs font-semibold text-[#2B2B2E] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-md shadow-red-600/25 transition-all cursor-pointer flex items-center justify-center"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
</>
  );
}
