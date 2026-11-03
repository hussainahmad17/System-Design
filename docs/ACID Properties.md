Atomicity (ALl or Nothing)
Consistency (Follow the rules)
Isolation (Wait in Line)
Durability (Saved Permanently)

Atomicity ensures that all operations of a transaction should be completed successfully. If any opertion fails, all the operations will be rollback.
Example: You transfer money to a friend. The system deducts money from your account but crashes before adding it to your friend's account. Atomicity cancels the deduction so your money is completely restored.

Consistency ensures that data must follow the database rules, constraints, and data types.
Example: Your database has a rule that account balances cannot drop below zero. If a transaction tries to withdraw more money than you have, consistency blocks the transaction and rejects the change.

Isolation ensures that for all the concurrent transactions, all the operations of a transaction should be independent. It acquires a lock on row untill that specific transaction is completed.
Operations of one transaction should not interfare each other.
Example: Two users try to buy the final concert ticket on a website at the exact same millisecond. Isolation forces one transaction to process first, ensuring only one person gets the ticket.


Durability (Saved Permanently)
Once a transaction is committed, it stays saved forever. A system failure, crash, or power outage will not erase the data.
Example: You buy a product and see the confirmation screen. If the database server loses power one second later, your order is completely safe on the hard drive and will still be there when the server restarts.

