-- Update platform_earnings table to use USD currency by default
UPDATE platform_earnings 
SET currency = 'USD' 
WHERE currency = 'NGN';

-- Update royalty_statements table to use USD currency by default  
UPDATE royalty_statements 
SET currency = 'USD' 
WHERE currency = 'NGN';