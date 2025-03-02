import { Fragment, useCallback, useEffect, useMemo } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee } from "./utils/types"

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

  const transactions = useMemo(
    () => paginatedTransactions?.data ?? transactionsByEmployee ?? null,
    [paginatedTransactions, transactionsByEmployee]
  )

  const isEmployeeFiltered = transactionsByEmployee !== null
  const hasMorePages = paginatedTransactions?.nextPage !== null

  // Determine if the app is in the initial loading state
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
            <Transactions transactions={transactions} />
          ) : (
            <div className="RampLoading--container">
              <p>Loading...</p>
            </div>
          )}
          {!isInitialLoading && !employeeTransactionsLoading && !isEmployeeFiltered && hasMorePages && (
            <button
              className="RampButton"
              disabled={transactionsLoading} // Properly disable the button during loading
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
