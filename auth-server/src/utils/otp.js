import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const createOtp = () => String(crypto.randomInt(100000, 1000000));

export const hashOtp = async (otp) => bcrypt.hash(otp, 10);

export const compareOtp = async (otp, otpHash) => bcrypt.compare(String(otp), otpHash);

export const getOtpExpiry = (minutes = 10) => new Date(Date.now() + minutes * 60 * 1000);