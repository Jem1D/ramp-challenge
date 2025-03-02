import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, loading: employeesLoading, fetchAll: fetchEmployees } = useEmployees()
  const {
    data: paginatedTransactions,
    loading: transactionsLoading,
    fetchAll: fetchTransactions,
    invalidateData: invalidatePaginatedData,
  } = usePaginatedTransactions()
  const {
    data: transactionsByEmployee,
    fetchById: fetchTransactionsByEmployee,
    invalidateData: invalidateEmployeeData,
    loading: employeeTransactionsLoading,
  } = useTransactionsByEmployee()

  // Global state to maintain the approval status of transactions
  const [approvalStatus, setApprovalStatus] = useState<{ [key: string]: boolean }>({})

  // Combine transactions with persisted approval status
  const transactions = useMemo(() => {
    const allTransactions = paginatedTransactions?.data ?? transactionsByEmployee ?? null
    if (!allTransactions) return null

    return allTransactions.map((transaction) => ({
      ...transaction,
      approved: approvalStatus[transaction.id] ?? transaction.approved,
    }))
  }, [paginatedTransactions, transactionsByEmployee, approvalStatus])

  const isEmployeeFiltered = transactionsByEmployee !== null
  const hasMorePages = paginatedTransactions?.nextPage !== null
  const isInitialLoading = transactions === null && transactionsLoading

  const loadAllTransactions = useCallback(async () => {
    invalidateEmployeeData()
    await fetchEmployees()
    await fetchTransactions()
  }, [fetchEmployees, fetchTransactions, invalidateEmployeeData])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      invalidatePaginatedData()
      await fetchTransactionsByEmployee(employeeId)
    },
    [invalidatePaginatedData, fetchTransactionsByEmployee]
  )

  useEffect(() => {
    if (employees === null && !employeesLoading) {
      fetchEmployees()
      fetchTransactions()
    }
  }, [employeesLoading, employees, fetchEmployees, fetchTransactions])

  // Function to handle transaction approval changes
  const setTransactionApproval = useCallback(
    async ({ transactionId, newValue }: { transactionId: string; newValue: boolean }) => {
      setApprovalStatus((prev) => ({
        ...prev,
        [transactionId]: newValue,
      }))
    },
    []
  )

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={employeesLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) return

            if (newValue.id === EMPTY_EMPLOYEE.id) {
              await loadAllTransactions()
            } else {
              await loadTransactionsByEmployee(newValue.id)
            }
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          {transactions !== null ? (
            <Transactions transactions={transactions} setTransactionApproval={setTransactionApproval} />
          ) : (
            <p>Loading transactions...</p>
          )}

          {!isInitialLoading && !employeeTransactionsLoading && !isEmployeeFiltered && hasMorePages && (
            <button
              className="RampButton"
              disabled={transactionsLoading}
              onClick={async () => {
                await fetchTransactions()
              }}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
