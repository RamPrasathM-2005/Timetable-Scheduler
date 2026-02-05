import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// --- FIX: Inject Global CSS to force SweetAlert above your React Modals ---
const style = document.createElement('style');
style.innerHTML = `
  div.swal2-container {
    z-index: 100000 !important; /* Higher than your Modal's 9999 */
  }
  .swal2-popup.swal-toast {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }
`;
document.head.appendChild(style);
// ------------------------------------------------------------------------

export { MySwal };

export const showErrorToast = (title, text) => {
  MySwal.fire({
    icon: 'error',
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    customClass: { popup: 'swal-toast' },
  });
};

export const showSuccessToast = (text) => {
  MySwal.fire({
    icon: 'success',
    title: 'Success',
    text,
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    customClass: { popup: 'swal-toast' },
  });
};

export const showInfoToast = (title, text) => {
  MySwal.fire({
    icon: 'info',
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    customClass: { popup: 'swal-toast' },
  });
};

export const showConfirmToast = (title, text, icon, confirmButtonText, cancelButtonText) => {
  return MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    toast: true, // Note: standard confirms usually aren't toasts, but kept as per your code
    position: 'top-end',
    customClass: { popup: 'swal-toast' },
    timer: 5000,
    timerProgressBar: true,
  });
};